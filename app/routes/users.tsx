import { redirect, useOutletContext } from "react-router";
import { ActionMenu } from "../components/shell/ActionMenu";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { StatusBadge } from "../components/shell/StatusBadge";
import { FilterSelect, SearchField } from "../components/ui/FilterSelect";
import { userActionItems } from "../components/users/userActions";
import { clientIp, recordAudit } from "../prisma/audit";
import { db } from "../prisma/db";
import { readFailure } from "../prisma/loader-error";
import {
  banExpiry,
  banUser,
  readBody,
  readText,
  unbanUser,
} from "../prisma/moderation";
import { requireOperator, requireOperatorRead } from "../prisma/operator";
import { readPageParams, readWindowDays } from "../prisma/paging";
import { toStamp } from "../prisma/time";
import { loadUserList, USER_SORT_KEYS } from "../prisma/users";
import type { Route } from "./+types/users";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Users" },
    { name: "description", content: "Every user on the Flonion platform." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireOperatorRead(request);
  const url = new URL(request.url);
  const params = readPageParams(url, USER_SORT_KEYS);

  const roles = url.searchParams.get("roles")?.split(",").filter(Boolean) ?? [];
  const filters = {
    q: url.searchParams.get("q"),
    roles,
    emailVerified: url.searchParams.get("emailVerified") as "yes" | "no" | null,
    twoFactor: url.searchParams.get("twoFactor") as "yes" | "no" | null,
    onboarded: url.searchParams.get("onboarded") as "yes" | "no" | null,
    banned: url.searchParams.get("banned") as "yes" | "no" | null,
    createdWithinDays: readWindowDays(url.searchParams),
  };

  try {
    return {
      data: await loadUserList(filters, params),
      filters,
      params,
      error: null,
    };
  } catch (cause) {
    return { data: null, filters, params, error: readFailure("users", cause) };
  }
}

/**
 * Every user mutation, including the ones started from other sections: "ban
 * reviewer" on Reviews, "ban requester" on Meetings and the toolbar on a
 * user's detail page all post here.
 */
export async function action({ request }: Route.ActionArgs) {
  const operator = await requireOperator(request);
  const body = await readBody(request);
  const intent = String(body.intent ?? "");
  const userId = typeof body.userId === "string" ? body.userId : "";
  const ip = clientIp(request);

  const u = await db.orm.public.User.where((x) => x.id.eq(userId))
    .select(
      "id",
      "name",
      "email",
      "role",
      "onboardingCompleted",
      "emailVerified",
      "banned",
    )
    .first();
  if (!u) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const now = toStamp(Date.now());

  switch (intent) {
    case "set-role": {
      const role = body.role as string;
      const validRoles = [
        "admin",
        "member",
        "designer",
        "developer",
        "manager",
        "marketing",
      ];
      if (!validRoles.includes(role)) {
        return Response.json({ error: "Invalid role" }, { status: 400 });
      }
      await db.transaction(async (tx) => {
        await tx.orm.public.User.where((x) => x.id.eq(userId)).update({
          role,
          updatedAt: now,
        });
        await recordAudit(tx, operator, {
          action: "user.set_role",
          entity: "user",
          entityId: userId,
          before: { role: u.role },
          after: { role },
          ip,
        });
      });
      return { ok: true };
    }

    case "toggle-onboarding": {
      const onboarded = !u.onboardingCompleted;
      await db.transaction(async (tx) => {
        await tx.orm.public.User.where((x) => x.id.eq(userId)).update({
          onboardingCompleted: onboarded,
          updatedAt: now,
        });
        await recordAudit(tx, operator, {
          action: "user.toggle_onboarding",
          entity: "user",
          entityId: userId,
          before: { onboardingCompleted: u.onboardingCompleted },
          after: { onboardingCompleted: onboarded },
          ip,
        });
      });
      return { ok: true };
    }

    case "force-email-verified": {
      await db.transaction(async (tx) => {
        await tx.orm.public.User.where((x) => x.id.eq(userId)).update({
          emailVerified: true,
          updatedAt: now,
        });
        await recordAudit(tx, operator, {
          action: "user.force_email_verified",
          entity: "user",
          entityId: userId,
          before: { emailVerified: u.emailVerified },
          after: { emailVerified: true },
          ip,
        });
      });
      return { ok: true };
    }

    case "ban-user": {
      const expiresAt = banExpiry(body.duration);
      if (expiresAt === undefined) {
        return Response.json({ error: "Invalid ban length" }, { status: 400 });
      }
      // `banReason` is the older field name; the dialog sends `reason`.
      const reason = readText(body.reason ?? body.banReason);
      await db.transaction(async (tx) => {
        await banUser(tx, operator, u, { reason, expiresAt, ip });
      });
      return { ok: true };
    }

    case "unban-user": {
      await db.transaction(async (tx) => {
        await unbanUser(tx, operator, u, ip);
      });
      return { ok: true };
    }

    case "revoke-all-sessions": {
      await db.transaction(async (tx) => {
        await tx.orm.public.Session.where((s) => s.userId.eq(userId)).delete();
        await recordAudit(tx, operator, {
          action: "user.revoke_sessions",
          entity: "user",
          entityId: userId,
          note: "Revoked all sessions",
          ip,
        });
      });
      return { ok: true };
    }

    case "delete-user": {
      const confirmEmail = body.confirmEmail ?? body.confirmName;
      if (confirmEmail !== u.email) {
        return Response.json(
          { error: "Email does not match" },
          { status: 400 },
        );
      }
      await db.transaction(async (tx) => {
        await tx.orm.public.User.where((x) => x.id.eq(userId)).delete();
        await recordAudit(tx, operator, {
          action: "user.delete",
          entity: "user",
          entityId: userId,
          before: { name: u.name, email: u.email },
          note: `Deleted user "${u.name}"`,
          ip,
        });
      });
      // A real redirect, not a hint in the JSON: the page that ran this is
      // about to lose its row, and a fetcher follows a redirect as navigation.
      return redirect("/users");
    }

    default:
      return Response.json(
        { error: `Unknown intent: ${intent}` },
        { status: 400 },
      );
  }
}

export default function Users({ loaderData }: Route.ComponentProps) {
  const { data, filters, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="Users" operator={operator} />

      {data === null ? (
        <SectionError
          title="Users unavailable"
          detail="The platform database could not be read."
          error={error}
        />
      ) : (
        <>
          <StatRow
            items={[
              { id: "total", label: "Users", value: data.stats.total },
              { id: "verified", label: "Verified", value: data.stats.verified },
              { id: "banned", label: "Banned", value: data.stats.banned },
            ]}
          />

          <FilterBar active={Boolean(filters.q || filters.banned)}>
            <SearchField
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search name or email..."
              label="Users"
            />
            <FilterSelect
              name="banned"
              label="Standing"
              defaultValue={filters.banned ?? ""}
              placeholder="Everyone"
              options={[
                { value: "yes", label: "Banned" },
                { value: "no", label: "Not banned" },
              ]}
            />
          </FilterBar>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Standing</th>
                  <th className="pb-2 font-medium">Verified</th>
                  <th className="pb-2 font-medium">2FA</th>
                  <th className="pb-2 font-medium">Banned</th>
                  <th className="pb-2 font-medium">Created</th>
                  <th className="pb-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.page.rows.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="py-2">
                      <a
                        href={`/users/${u.id}`}
                        className="text-teal-600 hover:underline"
                      >
                        {u.name}
                      </a>
                    </td>
                    <td className="py-2 text-gray-600">{u.email}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="py-2 text-gray-600">{u.standing}</td>
                    <td className="py-2">{u.emailVerified ? "Yes" : "No"}</td>
                    <td className="py-2">
                      {u.twoFactorEnabled ? "Yes" : "No"}
                    </td>
                    <td className="py-2">
                      {u.banned ? (
                        <StatusBadge
                          tone="bad"
                          title={u.banReason ?? undefined}
                        >
                          {u.banExpires ? `Until ${u.banExpires}` : "Banned"}
                        </StatusBadge>
                      ) : (
                        "No"
                      )}
                    </td>
                    <td className="py-2 text-gray-600">{u.created}</td>
                    <td className="py-2 text-right">
                      <ActionMenu
                        label={`Actions for ${u.name}`}
                        items={userActionItems(u)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={data.page} />
        </>
      )}
    </div>
  );
}

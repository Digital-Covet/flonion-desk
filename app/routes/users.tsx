import { useOutletContext } from "react-router";
import { FilterBar } from "../components/shell/FilterBar";
import { PageHeader } from "../components/shell/PageHeader";
import { Pagination } from "../components/shell/Pagination";
import { SectionError } from "../components/shell/SectionError";
import { StatRow } from "../components/shell/StatRow";
import { SearchField } from "../components/ui/FilterSelect";
import { recordAudit } from "../prisma/audit";
import { db } from "../prisma/db";
import { requireOperator } from "../prisma/operator";
import { readPageParams } from "../prisma/paging";
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
    createdWithinDays: url.searchParams.get("createdWithinDays")
      ? Number.parseInt(url.searchParams.get("createdWithinDays") ?? "0", 10)
      : null,
  };

  try {
    return {
      data: await loadUserList(filters, params),
      params,
      error: null,
    };
  } catch (cause) {
    console.error("users loader failed", cause);
    return {
      data: null,
      params,
      error: cause instanceof Error ? cause.message : "Unknown database error",
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const operator = requireOperator(request);
  const body = await request.json();
  const intent = body.intent as string;
  const userId = body.userId as string;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

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

  const now = new Date().toISOString();

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
      await db.orm.public.User.where((x) => x.id.eq(userId)).update({
        role,
        updatedAt: now,
      } as never);
      await recordAudit(
        operator,
        {
          action: "user.set_role",
          entity: "user",
          entityId: userId,
          before: { role: u.role },
          after: { role },
          ip,
        },
        db.orm.public as never,
      );
      return { ok: true };
    }

    case "toggle-onboarding": {
      const onboarded = !u.onboardingCompleted;
      await db.orm.public.User.where((x) => x.id.eq(userId)).update({
        onboardingCompleted: onboarded,
        updatedAt: now,
      } as never);
      await recordAudit(
        operator,
        {
          action: "user.toggle_onboarding",
          entity: "user",
          entityId: userId,
          before: { onboardingCompleted: u.onboardingCompleted },
          after: { onboardingCompleted: onboarded },
          ip,
        },
        db.orm.public as never,
      );
      return { ok: true };
    }

    case "force-email-verified": {
      await db.orm.public.User.where((x) => x.id.eq(userId)).update({
        emailVerified: true,
        updatedAt: now,
      } as never);
      await recordAudit(
        operator,
        {
          action: "user.force_email_verified",
          entity: "user",
          entityId: userId,
          before: { emailVerified: u.emailVerified },
          after: { emailVerified: true },
          ip,
        },
        db.orm.public as never,
      );
      return { ok: true };
    }

    case "ban-user": {
      const banReason =
        typeof body.banReason === "string"
          ? body.banReason.trim() || null
          : null;
      await db.orm.public.User.where((x) => x.id.eq(userId)).update({
        banned: true,
        banReason,
        updatedAt: now,
      } as never);
      await recordAudit(
        operator,
        {
          action: "user.ban",
          entity: "user",
          entityId: userId,
          before: { banned: u.banned },
          after: { banned: true, banReason },
          ip,
        },
        db.orm.public as never,
      );
      return { ok: true };
    }

    case "unban-user": {
      await db.orm.public.User.where((x) => x.id.eq(userId)).update({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: now,
      } as never);
      await recordAudit(
        operator,
        {
          action: "user.unban",
          entity: "user",
          entityId: userId,
          before: { banned: u.banned },
          after: { banned: false },
          ip,
        },
        db.orm.public as never,
      );
      return { ok: true };
    }

    case "revoke-all-sessions": {
      await db.orm.public.Session.where((s) => s.userId.eq(userId)).delete();
      await recordAudit(
        operator,
        {
          action: "user.revoke_sessions",
          entity: "user",
          entityId: userId,
          note: "Revoked all sessions",
          ip,
        },
        db.orm.public as never,
      );
      return { ok: true };
    }

    case "delete-user": {
      const confirmEmail = body.confirmEmail as string;
      if (confirmEmail !== u.email) {
        return Response.json(
          { error: "Email does not match" },
          { status: 400 },
        );
      }
      await db.orm.public.User.where((x) => x.id.eq(userId)).delete();
      await recordAudit(
        operator,
        {
          action: "user.delete",
          entity: "user",
          entityId: userId,
          before: { name: u.name, email: u.email },
          note: `Deleted user "${u.name}"`,
          ip,
        },
        db.orm.public as never,
      );
      return { ok: true, redirect: "/users" };
    }

    default:
      return Response.json(
        { error: `Unknown intent: ${intent}` },
        { status: 400 },
      );
  }
}

export default function Users({ loaderData }: Route.ComponentProps) {
  const { data, error } = loaderData;
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

          <FilterBar active={false}>
            <SearchField
              name="q"
              defaultValue=""
              placeholder="Search name or email..."
              label="Users"
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
                        <span className="text-red-600 font-medium">Banned</span>
                      ) : (
                        "No"
                      )}
                    </td>
                    <td className="py-2 text-gray-600">{u.created}</td>
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

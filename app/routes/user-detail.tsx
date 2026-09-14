import { useOutletContext } from "react-router";
import { PageHeader } from "../components/shell/PageHeader";
import { SectionError } from "../components/shell/SectionError";
import { readFailure } from "../prisma/loader-error";
import { requireOperatorRead } from "../prisma/operator";
import { loadUserDetail } from "../prisma/users";
import type { Route } from "./+types/user-detail";
import type { ConsoleContext } from "./console";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData?.user
        ? `Flonion Desk — ${loaderData.user.name}`
        : "Flonion Desk — User",
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  requireOperatorRead(request);
  if (!params.id) {
    return { user: null, error: "Missing user id" };
  }

  try {
    const user = await loadUserDetail(params.id);
    return { user, error: user === null ? "User not found" : null };
  } catch (cause) {
    return { user: null, error: readFailure("user detail", cause) };
  }
}

export async function action({ request: _request }: Route.ActionArgs) {
  // Impersonation is POSTed from the user detail page via useFetcher to /impersonate
  // This action exists as a placeholder; all user mutations go through /users.
  return Response.json(
    { error: "Use the section route for mutations" },
    { status: 400 },
  );
}

export default function UserDetail({ loaderData }: Route.ComponentProps) {
  const { user, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader
        title={user?.name ?? "User"}
        operator={operator}
        trail={[
          { label: "Users", to: "/users" },
          { label: user?.name ?? "..." },
        ]}
      />

      {user === null ? (
        <SectionError
          title="User not found"
          detail="This user does not exist or has been deleted."
          error={error}
        />
      ) : (
        <div className="mt-6 grid gap-6 max-w-3xl">
          {/* Identity card */}
          <section className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Identity</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{user.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Role</dt>
                <dd className="font-medium">{user.role}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Standing</dt>
                <dd className="font-medium">
                  {user.ownedBusiness
                    ? `Owner of ${user.ownedBusiness.name}`
                    : user.teamBusiness
                      ? `Member of ${user.teamBusiness.name}`
                      : "Unattached"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Email verified</dt>
                <dd>{user.emailVerified ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">2FA enabled</dt>
                <dd>{user.twoFactorEnabled ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Onboarded</dt>
                <dd>{user.onboarded ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Banned</dt>
                <dd>
                  {user.banned ? (
                    <span className="text-red-600 font-medium">
                      Yes
                      {user.banReason ? ` — ${user.banReason}` : ""}
                      {user.banExpires
                        ? ` (expires ${user.banExpires})`
                        : " (indefinite)"}
                    </span>
                  ) : (
                    "No"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd>{user.created}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last updated</dt>
                <dd>{user.updated}</dd>
              </div>
            </dl>
          </section>

          {/* Sessions */}
          <section className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">
              Sessions ({user.sessions.length})
            </h2>
            {user.sessions.length === 0 ? (
              <p className="text-sm text-gray-500">No active sessions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">IP</th>
                      <th className="pb-2 font-medium">User Agent</th>
                      <th className="pb-2 font-medium">Expires</th>
                      <th className="pb-2 font-medium">Impersonated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.sessions.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100">
                        <td className="py-2 font-mono text-xs">
                          {s.ipAddress ?? "Unknown"}
                        </td>
                        <td className="py-2 text-gray-600 text-xs max-w-[200px] truncate">
                          {s.userAgent ?? "Unknown"}
                        </td>
                        <td className="py-2 text-gray-600">{s.expiresAt}</td>
                        <td className="py-2">
                          {s.impersonatedBy ? (
                            <span className="text-orange-600 text-xs font-medium">
                              By {s.impersonatedBy}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Activity summary */}
          <section className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Activity</h2>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Reviews</dt>
                <dd className="text-xl font-semibold">{user.reviewCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Feedback</dt>
                <dd className="text-xl font-semibold">{user.feedbackCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Join requests</dt>
                <dd className="text-xl font-semibold">
                  {user.joinRequestCount}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}

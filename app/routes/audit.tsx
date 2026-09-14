import { useOutletContext } from "react-router";
import { PageHeader } from "../components/shell/PageHeader";
import { SectionError } from "../components/shell/SectionError";
import { db } from "../prisma/db";
import { readFailure } from "../prisma/loader-error";
import { requireOperatorRead } from "../prisma/operator";
import type { Route } from "./+types/audit";
import type { ConsoleContext } from "./console";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Flonion Desk — Audit Log" },
    {
      name: "description",
      content: "Operator actions recorded across the platform.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireOperatorRead(request);
  const url = new URL(request.url);
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10),
  );
  const size = Math.min(
    100,
    Math.max(1, Number.parseInt(url.searchParams.get("size") ?? "50", 10)),
  );
  const offset = (page - 1) * size;

  try {
    const [rows, total] = await Promise.all([
      db.orm.public.AuditLog.orderBy((a) => a.createdAt.desc())
        .offset(offset)
        .limit(size)
        .all(),
      db.orm.public.AuditLog.aggregate((a) => ({ n: a.count() })),
    ]);

    return {
      data: {
        rows: rows.map((r) => ({
          id: r.id,
          operatorId: r.operatorId,
          action: r.action,
          entity: r.entity,
          entityId: r.entityId,
          note: r.note,
          ip: r.ip,
          createdAt: r.createdAt,
        })),
        total: total.n,
        page,
        size,
        pageCount: Math.max(1, Math.ceil(total.n / size)),
      },
      error: null,
    };
  } catch (cause) {
    return { data: null, error: readFailure("audit", cause) };
  }
}

export default function AuditLog({ loaderData }: Route.ComponentProps) {
  const { data, error } = loaderData;
  const { operator } = useOutletContext<ConsoleContext>();

  return (
    <div className="flex-1 overflow-auto p-6 min-w-0">
      <PageHeader title="Audit Log" operator={operator} />

      {data === null ? (
        <SectionError
          title="Audit log unavailable"
          detail="The platform database could not be read."
          error={error}
        />
      ) : (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-4">
            {data.total} total entries
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Operator</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Entity</th>
                  <th className="pb-2 font-medium">Entity ID</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-600 whitespace-nowrap">
                      {row.createdAt}
                    </td>
                    <td className="py-2">{row.operatorId}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
                        {row.action}
                      </span>
                    </td>
                    <td className="py-2">{row.entity}</td>
                    <td className="py-2 font-mono text-xs">{row.entityId}</td>
                    <td className="py-2 text-gray-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pageCount > 1 && (
            <div className="mt-4 flex gap-2 text-sm">
              {Array.from({ length: data.pageCount }, (_, i) => i + 1).map(
                (p) => (
                  <a
                    key={p}
                    href={`?page=${p}&size=${data.size}`}
                    className={`px-3 py-1 rounded ${
                      p === data.page
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {p}
                  </a>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { SortDir } from "../../prisma/paging";
import { CARD, COLORS, TEXT_LABEL, TEXT_MUTED } from "../constants";

export interface Column<TRow> {
  id: string;
  label: string;
  /** Sort key to send as `?sort=`. Omit for a column that cannot be ordered. */
  sortKey?: string;
  /** Right-align, for numeric columns. */
  numeric?: boolean;
  render: (row: TRow) => ReactNode;
}

/**
 * Table chrome shared by every section: header row, sortable headings, empty
 * state, and a horizontal scroll container.
 *
 * The scroll container matters. These tables are wide and the page body must
 * never scroll sideways, so the overflow is owned here rather than by each
 * section discovering the problem separately.
 */
export function DataTable<TRow>({
  rows,
  columns,
  rowKey,
  sort,
  dir,
  empty,
  framed = true,
}: {
  rows: TRow[];
  columns: Column<TRow>[];
  rowKey: (row: TRow) => string;
  sort?: string;
  dir?: SortDir;
  /** Shown in place of the table when there are no rows. */
  empty: string;
  /**
   * Wrap in the CARD panel. Set to false when the table lives inside a
   * section that already owns the card, such as the Marketplace panels.
   */
  framed?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className={framed ? `${CARD} p-8` : "py-8"}>
        <p className={TEXT_MUTED}>{empty}</p>
      </div>
    );
  }

  return (
    <div className={framed ? `${CARD} overflow-x-auto` : "overflow-x-auto"}>
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={`px-5 py-3 border-b ${
                  col.numeric ? "text-right" : "text-left"
                }`}
                style={{ borderColor: COLORS.border }}
              >
                <SortableHeading column={col} sort={sort} dir={dir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-[#f8f9fa]">
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={`px-5 py-3 border-b align-middle ${
                    col.numeric ? "text-right" : "text-left"
                  }`}
                  style={{ borderColor: COLORS.border }}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A column heading. Sortable ones are links that flip direction on the active
 * column and default to descending elsewhere, since every sortable column here
 * answers "most" before it answers "least".
 */
function SortableHeading<TRow>({
  column,
  sort,
  dir,
}: {
  column: Column<TRow>;
  sort?: string;
  dir?: SortDir;
}) {
  const [params] = useSearchParams();

  if (!column.sortKey) {
    return <span className={`${TEXT_LABEL} uppercase`}>{column.label}</span>;
  }

  const activeColumn = sort === column.sortKey;
  const nextDir: SortDir = activeColumn && dir === "desc" ? "asc" : "desc";

  const next = new URLSearchParams(params);
  next.set("sort", column.sortKey);
  next.set("dir", nextDir);
  // A re-sort invalidates the current offset, so start again from the top.
  next.delete("page");

  return (
    <Link
      to={`?${next.toString()}`}
      preventScrollReset
      className={`${TEXT_LABEL} uppercase inline-flex items-center gap-1 hover:text-[#2D3748]`}
      aria-sort={
        activeColumn ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      {column.label}
      {activeColumn ? (
        dir === "asc" ? (
          <ChevronUp size={12} color={COLORS.textDark} />
        ) : (
          <ChevronDown size={12} color={COLORS.textDark} />
        )
      ) : null}
    </Link>
  );
}

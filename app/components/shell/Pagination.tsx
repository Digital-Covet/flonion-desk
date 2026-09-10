import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import type { PageResult } from "../../prisma/paging";
import { CHIP, COLORS, FONT_BOLD, TEXT_MUTED_SM } from "../constants";

/**
 * The pager under a section table.
 *
 * Pages are links, not buttons: the page number lives in the URL, so an
 * operator can bookmark or share page 3 of a filtered view, and the browser's
 * own history works. Every other search parameter is carried across untouched,
 * which is what keeps filters and sort from being dropped on page change.
 */
export function Pagination<TRow>({ page }: { page: PageResult<TRow> }) {
  const [params] = useSearchParams();

  const to = (n: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(n));
    return `?${next.toString()}`;
  };

  const first = page.total === 0 ? 0 : (page.page - 1) * page.size + 1;
  const last = Math.min(page.page * page.size, page.total);

  const hasPrev = page.page > 1;
  const hasNext = page.page < page.pageCount;

  return (
    <div className="flex items-center justify-between mt-4 mb-6">
      <p className={TEXT_MUTED_SM}>
        {page.total === 0
          ? "No matching businesses"
          : `Showing ${first}–${last} of ${page.total.toLocaleString("en-IN")}`}
      </p>

      <div className="flex items-center gap-2">
        <PagerButton
          to={to(page.page - 1)}
          enabled={hasPrev}
          label="Previous page"
        >
          <ChevronLeft size={16} color={COLORS.textDark} />
        </PagerButton>

        <span className={`${FONT_BOLD} text-[12px] text-[#2D3748] px-2`}>
          Page {page.page} of {page.pageCount}
        </span>

        <PagerButton to={to(page.page + 1)} enabled={hasNext} label="Next page">
          <ChevronRight size={16} color={COLORS.textDark} />
        </PagerButton>
      </div>
    </div>
  );
}

/**
 * A pager arrow. Disabled ends render as a dimmed span rather than a link, so
 * there is nothing to click that would do nothing.
 */
function PagerButton({
  to,
  enabled,
  label,
  children,
}: {
  to: string;
  enabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = `flex items-center justify-center size-[32px] ${CHIP}`;

  if (!enabled) {
    return (
      <span className={`${className} opacity-40`} aria-hidden="true">
        {children}
      </span>
    );
  }

  return (
    <Link to={to} className={className} aria-label={label} preventScrollReset>
      {children}
    </Link>
  );
}

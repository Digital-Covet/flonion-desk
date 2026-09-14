import { Button } from "@base-ui/react/button";
import { Form, useSearchParams } from "react-router";
import { FONT_BOLD } from "../constants";

/**
 * Generic filter bar that submits as a GET form, so filters are URL-state
 * and a bookmarked link reproduces the exact view.
 *
 * `children` are the filter controls; this component wraps them in a form
 * that resets to page 1 on submit. The actual filter parsing happens in each
 * section's data module.
 */
export function FilterBar({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  const [searchParams] = useSearchParams();

  // Preserve current page state but reset to page 1 on filter change
  const params = new URLSearchParams(searchParams);
  params.delete("page");

  return (
    <Form method="get" className="mb-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm border border-gray-100">
        {children}
        <Button
          type="submit"
          className={`${FONT_BOLD} text-[12px] rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 transition-colors`}
        >
          Apply
        </Button>
        {active ? (
          <Button
            render={<a href="?" />}
            className={`${FONT_BOLD} text-[12px] rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 transition-colors`}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </Form>
  );
}

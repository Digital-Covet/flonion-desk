import { readFailure } from "../prisma/loader-error";
import { requireOperatorRead } from "../prisma/operator";
import { loadFeedbackThread } from "../prisma/support";
import type { Route } from "./+types/support-thread";

/**
 * Resource route: one feedback item with its replies, for the reply dialog.
 *
 * The dialog loads it on open rather than the inbox loading every thread up
 * front, so the list stays one query per page however long threads get.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  await requireOperatorRead(request);
  try {
    const thread = await loadFeedbackThread(params.id);
    return thread
      ? { thread, error: null }
      : { thread: null, error: "Feedback not found" };
  } catch (cause) {
    return { thread: null, error: readFailure("support thread", cause) };
  }
}

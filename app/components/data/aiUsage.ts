/**
 * `?businessId=` value selecting AI calls with no business on the ledger row:
 * public review suggestions made before attribution existed, and calls from
 * users who belong to no business.
 *
 * Lives outside `app/prisma` so client components can import it without
 * pulling the database module into the browser bundle.
 */
export const UNATTRIBUTED = "none";

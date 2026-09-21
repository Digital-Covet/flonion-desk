import type { ActionItem } from "../shell/ActionMenu";

/**
 * Moderation items for a business: the Businesses table, a business's detail
 * page and the Marketplace lists all offer the same set. Each posts to
 * `/businesses`, whose action hands them to `handleBusinessModeration`.
 */
export function businessActionItems(b: {
  id: string;
  name: string;
  status: string;
  marketplaceHidden: boolean;
  /** Omit where the owner is not known, and the ban item is left out. */
  ownerBanned?: boolean;
}): ActionItem[] {
  const payload = { businessId: b.id };
  const suspended = b.status === "suspended";

  return [
    {
      label: "Suspend…",
      intent: "suspend-business",
      action: "/businesses",
      payload,
      destructive: true,
      hidden: suspended,
      dialog: {
        title: `Suspend ${b.name}?`,
        description:
          "The owner and team are locked out of Flonion, and the public profile, booking page, review links and marketplace listing stop working until it is lifted.",
        confirmLabel: "Suspend business",
        text: { label: "Reason", required: true },
        checkbox: {
          name: "banMembers",
          label: "Also ban the owner and every team member",
        },
      },
    },
    {
      label: "Lift suspension",
      intent: "unsuspend-business",
      action: "/businesses",
      payload,
      hidden: !suspended,
      dialog: {
        title: `Lift the suspension on ${b.name}?`,
        description:
          "The business goes back to normal. Any user bans placed alongside the suspension stay in place; lift those on the Users page.",
        confirmLabel: "Lift suspension",
        text: { label: "Note" },
      },
    },
    {
      label: "Hide from marketplace…",
      intent: "hide-from-marketplace",
      action: "/businesses",
      payload,
      hidden: b.marketplaceHidden,
      dialog: {
        title: `Hide ${b.name} from the marketplace?`,
        description:
          "The listing leaves partner search. The business itself keeps working, and its profile link still opens.",
        confirmLabel: "Hide listing",
        text: { label: "Reason" },
      },
    },
    {
      label: "Show in marketplace",
      intent: "show-in-marketplace",
      action: "/businesses",
      payload,
      hidden: !b.marketplaceHidden,
    },
    {
      label: "Ban owner…",
      intent: "ban-owner",
      action: "/businesses",
      payload,
      destructive: true,
      hidden: b.ownerBanned === undefined || b.ownerBanned,
      dialog: {
        title: `Ban the owner of ${b.name}?`,
        description:
          "The owner is signed out at once and cannot sign in until the ban lapses or is lifted. Team members are unaffected.",
        confirmLabel: "Ban owner",
        text: { label: "Reason", required: true },
        duration: true,
      },
    },
  ];
}

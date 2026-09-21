import type { ActionItem } from "../shell/ActionMenu";

/**
 * Moderation items for a user, shared by the Users table and a user's detail
 * page. Each posts to `/users`, whose action owns every user mutation.
 */
export function userActionItems(u: {
  id: string;
  name: string;
  email: string;
  banned: boolean;
  emailVerified: boolean;
}): ActionItem[] {
  const payload = { userId: u.id };
  return [
    banUserItem(u.id, u.name, "Ban…", u.banned),
    {
      label: "Unban",
      intent: "unban-user",
      action: "/users",
      payload,
      hidden: !u.banned,
      dialog: {
        title: `Unban ${u.name}?`,
        description:
          "They can sign in again straight away. Sessions revoked by the ban stay revoked.",
        confirmLabel: "Unban",
      },
    },
    {
      label: "Revoke all sessions",
      intent: "revoke-all-sessions",
      action: "/users",
      payload,
      dialog: {
        title: `Sign ${u.name} out everywhere?`,
        description:
          "Every active session is deleted. They can sign in again unless banned.",
        confirmLabel: "Revoke sessions",
      },
    },
    {
      label: "Mark email verified",
      intent: "force-email-verified",
      action: "/users",
      payload,
      hidden: u.emailVerified,
    },
    {
      label: "Toggle onboarding",
      intent: "toggle-onboarding",
      action: "/users",
      payload,
    },
    {
      label: "Delete user…",
      intent: "delete-user",
      action: "/users",
      payload,
      destructive: true,
      dialog: {
        title: `Delete ${u.name}?`,
        description:
          "This deletes the user, their sessions and any business they own. It cannot be undone from the desk; an archived copy is kept in the database for a year.",
        confirmLabel: "Delete user",
        confirmValue: u.email,
      },
    },
  ];
}

/**
 * "Ban…" for a user, usable from any section. Hidden when already banned, so
 * a Reviews or Meetings row never offers to ban someone twice.
 */
export function banUserItem(
  userId: string,
  name: string,
  label: string,
  alreadyBanned = false,
): ActionItem {
  return {
    label,
    intent: "ban-user",
    action: "/users",
    payload: { userId },
    destructive: true,
    hidden: alreadyBanned,
    dialog: {
      title: `Ban ${name}?`,
      description:
        "They are signed out at once and cannot sign in to Flonion until the ban lapses or is lifted.",
      confirmLabel: "Ban user",
      text: {
        label: "Reason",
        required: true,
        placeholder: "Shown in the audit log and on the user's record",
      },
      duration: true,
    },
  };
}

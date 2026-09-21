import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "./db";
import {
  likeTerm,
  type PageParams,
  type PageResult,
  pageResult,
} from "./paging";
import { daysAgo, formatDate } from "./time";

/**
 * Fields safe to expose from the User model.
 *
 * Passwords, OAuth tokens, 2FA secrets, backup codes, and AES-GCM token
 * ciphertext are never selected. Editing this tuple is the only way those
 * fields can leak — every `select` in this module references it.
 */
const SAFE_FIELDS = [
  "id",
  "name",
  "email",
  "emailVerified",
  "image",
  "createdAt",
  "updatedAt",
  "twoFactorEnabled",
  "onboardingCompleted",
  "businessId",
  "role",
  "banned",
  "banReason",
  "banExpires",
] as const;

export type UserSort = "name" | "email" | "createdAt";

export interface UserFilters {
  q: string | null;
  roles: string[];
  emailVerified: "yes" | "no" | null;
  twoFactor: "yes" | "no" | null;
  onboarded: "yes" | "no" | null;
  banned: "yes" | "no" | null;
  createdWithinDays: number | null;
}

export const USER_SORT_KEYS: readonly UserSort[] = [
  "name",
  "email",
  "createdAt",
];

function filtered(f: UserFilters) {
  let c = db.orm.public.User.where((u) => u.id.isNotNull());

  const term = likeTerm(f.q);
  if (term) {
    c = c.where((u) => or(u.name.ilike(term), u.email.ilike(term)));
  }

  if (f.roles.length > 0) {
    const roles = f.roles;
    c = c.where((u) => u.role.in(roles));
  }

  if (f.emailVerified === "yes") c = c.where((u) => u.emailVerified.eq(true));
  if (f.emailVerified === "no") c = c.where((u) => u.emailVerified.eq(false));

  if (f.twoFactor === "yes") c = c.where((u) => u.twoFactorEnabled.eq(true));
  if (f.twoFactor === "no") c = c.where((u) => u.twoFactorEnabled.eq(false));

  if (f.onboarded === "yes") c = c.where((u) => u.onboardingCompleted.eq(true));
  if (f.onboarded === "no") c = c.where((u) => u.onboardingCompleted.eq(false));

  if (f.banned === "yes") c = c.where((u) => u.banned.eq(true));
  // The column is nullable with a false default; NULL means never banned.
  if (f.banned === "no")
    c = c.where((u) => or(u.banned.eq(false), u.banned.isNull()));

  if (f.createdWithinDays !== null) {
    const cutoff = daysAgo(f.createdWithinDays);
    c = c.where((u) => u.createdAt.gte(cutoff));
  }

  return c;
}

export interface UserListRow {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  emailVerified: boolean;
  role: string;
  twoFactorEnabled: boolean;
  onboarded: boolean;
  banned: boolean;
  banReason: string | null;
  /** Formatted date the ban lapses, or null when it is indefinite. */
  banExpires: string | null;
  /** "Owner of X", "Member of Y", or "Unattached". */
  standing: string;
  sessionCount: number;
  hasGoogleToken: boolean;
  created: string;
}

export interface UserListData {
  page: PageResult<UserListRow>;
  stats: {
    total: number;
    verified: number;
    banned: number;
  };
}

export async function loadUserList(
  filters: UserFilters,
  params: PageParams<UserSort>,
): Promise<UserListData> {
  const c = filtered(filters);
  const all = db.orm.public.User;

  const [rows, matching, total, verified, banned] = await Promise.all([
    c
      .select(...SAFE_FIELDS)
      .include("business", (b) => b.select("id", "name"))
      .include("sessions", (s) => s.count())
      .include("googleToken", (g) => g.select("id"))
      .orderBy([
        (u) => {
          const field =
            params.sort === "name"
              ? u.name
              : params.sort === "email"
                ? u.email
                : u.createdAt;
          return params.dir === "asc" ? field.asc() : field.desc();
        },
        (u) => u.id.asc(),
      ])
      .offset(params.offset)
      .limit(params.size)
      .all(),
    c.aggregate((a) => ({ n: a.count() })),
    all.aggregate((a) => ({ n: a.count() })),
    all
      .where((u) => u.emailVerified.eq(true))
      .aggregate((a) => ({ n: a.count() })),
    all.where((u) => u.banned.eq(true)).aggregate((a) => ({ n: a.count() })),
  ]);

  const listRows: UserListRow[] = rows.map((u) => {
    let standing: string;
    if (u.business) {
      standing = `Owner of ${u.business.name}`;
    } else if (u.businessId) {
      standing = `Member of team`;
    } else {
      standing = "Unattached";
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.image,
      emailVerified: u.emailVerified,
      role: u.role,
      twoFactorEnabled: u.twoFactorEnabled ?? false,
      onboarded: u.onboardingCompleted,
      banned: u.banned ?? false,
      banReason: u.banReason,
      banExpires: u.banExpires ? formatDate(u.banExpires) : null,
      standing,
      sessionCount: u.sessions,
      hasGoogleToken: u.googleToken !== null,
      created: formatDate(u.createdAt),
    };
  });

  return {
    page: pageResult(listRows, matching.n, params),
    stats: {
      total: total.n,
      verified: verified.n,
      banned: banned.n,
    },
  };
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  emailVerified: boolean;
  role: string;
  twoFactorEnabled: boolean;
  onboarded: boolean;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  created: string;
  updated: string;
  sessions: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: string;
    impersonatedBy: string | null;
  }>;
  accounts: Array<{
    providerId: string;
    scope: string | null;
    createdAt: string;
  }>;
  ownedBusiness: { id: string; name: string } | null;
  teamBusiness: { id: string; name: string } | null;
  reviewCount: number;
  feedbackCount: number;
  joinRequestCount: number;
}

export async function loadUserDetail(id: string): Promise<UserData | null> {
  const u = await db.orm.public.User.where((x) => x.id.eq(id))
    .select(...SAFE_FIELDS)
    .include("sessions", (s) =>
      s.select("id", "ipAddress", "userAgent", "expiresAt", "impersonatedBy"),
    )
    .include("accounts", (a) => a.select("providerId", "scope", "createdAt"))
    .include("business", (b) => b.select("id", "name"))
    .include("businessBusiness", (b) => b.select("id", "name"))
    .include("sharedReviews", (r) => r.count())
    .include("feedbacks", (f) => f.count())
    .include("joinRequestsJoinRequest", (j) => j.count())
    .first();

  if (!u) return null;

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.image,
    emailVerified: u.emailVerified,
    role: u.role,
    twoFactorEnabled: u.twoFactorEnabled ?? false,
    onboarded: u.onboardingCompleted,
    banned: u.banned ?? false,
    banReason: u.banReason,
    banExpires: u.banExpires ? formatDate(u.banExpires) : null,
    created: formatDate(u.createdAt),
    updated: formatDate(u.updatedAt),
    sessions: u.sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      impersonatedBy: s.impersonatedBy,
    })),
    accounts: u.accounts.map((a) => ({
      providerId: a.providerId,
      scope: a.scope,
      createdAt: formatDate(a.createdAt),
    })),
    ownedBusiness: u.business
      ? { id: u.business.id, name: u.business.name }
      : null,
    teamBusiness: u.businessBusiness
      ? { id: u.businessBusiness.id, name: u.businessBusiness.name }
      : null,
    reviewCount: u.sharedReviews,
    feedbackCount: u.feedbacks,
    joinRequestCount: u.joinRequestsJoinRequest,
  };
}

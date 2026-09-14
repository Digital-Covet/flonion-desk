import { Tabs } from "@base-ui/react/tabs";
import {
  CARD,
  COLORS,
  FONT_BOLD,
  FONT_HEADING,
  FONT_REGULAR,
  TEXT_CARD_TITLE,
  TEXT_LABEL,
  TEXT_MUTED_SM,
} from "../constants";
import type { BusinessDetailData, BusinessPerson } from "../types";
import { Hint } from "../ui/Hint";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Everything known about one business, organised into tabs.
 *
 * The schedule block is read-only, and stays that way. The tenant app
 * validates `slotDuration` against a fixed set and generates bookable slots
 * from these seven values; editing them from here without replicating that
 * validation is how a customer's calendar gets corrupted.
 */
export function BusinessDetail({ business }: { business: BusinessDetailData }) {
  const keywords = (business.keywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Tabs.Root defaultValue="profile" className="flex flex-col gap-4">
        <Tabs.List className="relative z-1 -mb-px flex gap-1 border-b border-gray-100">
          <Tabs.Tab value="profile" className={tabClassName}>
            Profile
          </Tabs.Tab>
          <Tabs.Tab value="google" className={tabClassName}>
            Google
          </Tabs.Tab>
          <Tabs.Tab value="team" className={tabClassName}>
            Owner & Team
          </Tabs.Tab>
          <Tabs.Tab value="content" className={tabClassName}>
            Content
          </Tabs.Tab>
          <Tabs.Indicator className="tabs-indicator" />
        </Tabs.List>

        {/* Profile */}
        <Tabs.Panel value="profile" className={panelClassName}>
          <section className={`${CARD} p-6`}>
            <h2 className={TEXT_CARD_TITLE}>Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
              <Field label="Name" value={business.name} />
              <Field
                label="Public profile"
                value={business.username ? `@${business.username}` : null}
                empty="No username claimed, so the public page is unreachable"
              />
              <Field label="Sector" value={business.sector} />
              <Field
                label="Category"
                value={business.category}
                empty="No keyword match"
                hint="Derived from sector and keywords at read time. There is no category column."
              />
              <Field label="Phone" value={business.phone} />
              <Field label="Address" value={business.address} />
              <Field label="Created" value={business.created} />
              <Field label="Last updated" value={business.updated} />
            </div>

            {business.description ? (
              <div className="mt-4">
                <p className={`${TEXT_LABEL} uppercase`}>Description</p>
                <p
                  className={`${FONT_REGULAR} text-[13px] text-[#2D3748] leading-[1.6] mt-1`}
                >
                  {business.description}
                </p>
              </div>
            ) : null}

            {keywords.length > 0 ? (
              <div className="mt-4">
                <p className={`${TEXT_LABEL} uppercase`}>Keywords</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((k) => (
                    <span
                      key={k}
                      className={`${FONT_REGULAR} text-[12px] px-2 py-1 rounded-[8px]`}
                      style={{
                        backgroundColor: "#F7FAFC",
                        color: COLORS.textDark,
                      }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </Tabs.Panel>

        {/* Google */}
        <Tabs.Panel value="google" className={panelClassName}>
          <section className={`${CARD} p-6`}>
            <h2 className={TEXT_CARD_TITLE}>Google</h2>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <p className={`${TEXT_LABEL} uppercase`}>Cached rating</p>
                {business.rating === null ? (
                  <p className={TEXT_MUTED_SM}>Never fetched</p>
                ) : (
                  <Hint label="Cached from Google Business Profile. No refresh timestamp exists, so its age is unknown.">
                    <p
                      className={`${FONT_HEADING} text-[22px] text-[#2D3748] leading-[1.3]`}
                    >
                      {business.rating.toFixed(1)}
                      <span className={TEXT_MUTED_SM}>
                        {" "}
                        from {business.reviewCount ?? 0} Google reviews
                      </span>
                    </p>
                  </Hint>
                )}
              </div>
              <Field
                label="Place claimed"
                value={business.placeId ? "Yes" : null}
                empty="No place id"
              />
              <Field
                label="Review link"
                value={business.reviewLink}
                empty="Not configured"
              />
              <Field
                label="QR scans"
                value={business.qrScanCount.toLocaleString("en-IN")}
              />
            </div>
            <p className={`${TEXT_MUTED_SM} mt-4 leading-[1.5]`}>
              These figures come from Google and are unrelated to reviews
              collected through Flonion.
            </p>
          </section>
        </Tabs.Panel>

        {/* Owner & Team + Schedule */}
        <Tabs.Panel value="team" className={panelClassName}>
          <div className="flex flex-col lg:flex-row gap-4">
            <section className={`${CARD} p-6 flex-1 min-w-0`}>
              <h2 className={TEXT_CARD_TITLE}>Owner</h2>
              <PersonRow person={business.owner} owner />
              <h2 className={`${TEXT_CARD_TITLE} mt-6`}>
                Team
                <span className={TEXT_MUTED_SM}>
                  {" "}
                  ({business.members.length})
                </span>
              </h2>
              {business.members.length === 0 ? (
                <p className={`${TEXT_MUTED_SM} mt-2`}>No other members.</p>
              ) : (
                <div className="flex flex-col">
                  {business.members.map((m) => (
                    <PersonRow key={m.id} person={m} />
                  ))}
                </div>
              )}
            </section>

            <section className={`${CARD} p-6 lg:w-[320px] flex-none`}>
              <h2 className={TEXT_CARD_TITLE}>Schedule</h2>
              <p className={`${TEXT_MUTED_SM} mt-1`}>
                Read-only. The tenant app generates bookable slots from these
                values.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Field
                  label="Working days"
                  value={formatDays(business.schedule.workingDays)}
                />
                <Field
                  label="Working hours"
                  value={`${business.schedule.workingStartTime} – ${business.schedule.workingEndTime}`}
                />
                <Field
                  label="Bookable window"
                  value={`${business.schedule.bookingStartTime} – ${business.schedule.bookingEndTime}`}
                />
                <Field
                  label="Slot length"
                  value={`${business.schedule.slotDuration} minutes`}
                />
                <Field label="Timezone" value={business.schedule.timezone} />
              </div>
            </section>
          </div>
        </Tabs.Panel>

        {/* Content */}
        <Tabs.Panel value="content" className={panelClassName}>
          <section className={`${CARD} p-6`}>
            <h2 className={TEXT_CARD_TITLE}>Content and activity</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
              {business.counts.map((c) => (
                <div key={c.id}>
                  <p
                    className={`${FONT_HEADING} text-[20px] text-[#2D3748] leading-[1.3]`}
                  >
                    {c.value.toLocaleString("en-IN")}
                  </p>
                  <p className={TEXT_MUTED_SM}>{c.label}</p>
                </div>
              ))}
            </div>
          </section>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

function Field({
  label,
  value,
  empty = "—",
  hint,
}: {
  label: string;
  value: string | null;
  empty?: string;
  hint?: string;
}) {
  const body = value ? (
    <p className={`${FONT_REGULAR} text-[13px] text-[#2D3748] break-words`}>
      {value}
    </p>
  ) : (
    <p className={TEXT_MUTED_SM}>{empty}</p>
  );

  return (
    <div className="min-w-0">
      <p className={`${TEXT_LABEL} uppercase`}>{label}</p>
      {hint ? <Hint label={hint}>{body}</Hint> : body}
    </div>
  );
}

function PersonRow({
  person,
  owner = false,
}: {
  person: BusinessPerson;
  owner?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0"
      style={{ borderColor: COLORS.border }}
    >
      <div className="min-w-0">
        <p className={`${FONT_BOLD} text-[13px] text-[#2D3748] truncate`}>
          {person.name}
        </p>
        <p className={`${TEXT_MUTED_SM} truncate`}>{person.email}</p>
      </div>
      <div className="flex items-center gap-2 flex-none">
        <Tag label={owner ? "Owner" : person.role} tone="neutral" />
        {person.emailVerified ? null : <Tag label="Unverified" tone="warn" />}
        {person.twoFactorEnabled ? <Tag label="2FA" tone="good" /> : null}
        {owner && person.onboardingCompleted === false ? (
          <Tag label="Onboarding incomplete" tone="warn" />
        ) : null}
      </div>
    </div>
  );
}

function Tag({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "good" | "warn";
}) {
  const palette = {
    neutral: { bg: "#F7FAFC", fg: COLORS.textDark },
    good: { bg: "#E6FFFA", fg: COLORS.tealDark },
    warn: { bg: "#FFF5F5", fg: COLORS.red },
  }[tone];

  return (
    <span
      className={`${FONT_BOLD} text-[11px] px-2 py-1 rounded-[8px] whitespace-nowrap`}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      {label}
    </span>
  );
}

/** "1,2,3,4,5" is Mon-Fri. 0 is Sunday, matching the tenant app's convention. */
function formatDays(raw: string): string {
  const days = raw
    .split(",")
    .map((d) => Number.parseInt(d.trim(), 10))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

  if (days.length === 0) return "None";
  return days.map((d) => DAY_NAMES[d]).join(", ");
}

const tabClassName =
  "flex h-[calc(2.5rem+1px)] items-center justify-center bg-transparent px-4 py-0 font-inherit text-sm font-normal leading-5 whitespace-nowrap text-gray-400 outline-none select-none hover:text-[#2D3748] focus-visible:outline-2 focus-visible:outline-teal-400 data-active:text-[#2D3748] data-active:font-semibold";

const panelClassName = "flex flex-col gap-4 outline-none";

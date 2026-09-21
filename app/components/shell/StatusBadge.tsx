/**
 * A small status pill. The tone, not the word, carries the meaning, so the
 * same five tones cover reviews, businesses, users, meetings and support.
 */
export type BadgeTone = "good" | "neutral" | "warn" | "bad" | "info";

const TONES: Record<BadgeTone, string> = {
  good: "bg-green-50 text-green-700",
  neutral: "bg-gray-100 text-gray-600",
  warn: "bg-yellow-50 text-yellow-700",
  bad: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

export function StatusBadge({
  tone,
  children,
  title,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
  /** Extra detail on hover, such as a suspension reason. */
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

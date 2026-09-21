/**
 * Outbound mail for the support inbox, through ZeptoMail.
 *
 * It uses the same account and env vars as the tenant app
 * (revme-ai/src/services/email.ts), so a reply comes from the address the
 * customer already gets Flonion mail from. It talks to the REST endpoint
 * directly rather than through the untyped `zeptomail` SDK: sending is one
 * POST, and `fetch` gives a real status code to report when it fails.
 *
 * `ZEPTOMAIL_URL` is read the way the SDK reads it: a host such as
 * `api.zeptomail.in/`, with or without a scheme, or a full URL that already
 * names the `/v1.1/...` endpoint.
 */

export interface OutboundEmail {
  to: string;
  toName: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string | null;
}

export class EmailNotConfiguredError extends Error {}

function endpoint(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url.includes("/v1.1")) return url;
  return `${url.replace(/\/+$/, "")}/v1.1/email`;
}

/** Escape operator- and customer-written text for the HTML part. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Resolves on acceptance; throws with a message worth storing otherwise. */
export async function sendEmail(mail: OutboundEmail): Promise<void> {
  const url = process.env.ZEPTOMAIL_URL;
  const token = process.env.ZEPTOMAIL_TOKEN;
  const sender = process.env.ZEPTOMAIL_SENDER_ADDRESS;
  if (!url || !token || !sender) {
    throw new EmailNotConfiguredError(
      "Email is not configured: set ZEPTOMAIL_URL, ZEPTOMAIL_TOKEN and ZEPTOMAIL_SENDER_ADDRESS",
    );
  }

  const cleanToken = token.replace(/^Zoho-enczapikey\s+/i, "");
  const response = await fetch(endpoint(url), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-enczapikey ${cleanToken}`,
    },
    body: JSON.stringify({
      from: { address: sender, name: "Flonion Support" },
      to: [{ email_address: { address: mail.to, name: mail.toName } }],
      ...(mail.replyTo ? { reply_to: [{ address: mail.replyTo }] } : {}),
      subject: mail.subject,
      textbody: mail.text,
      htmlbody: mail.html,
    }),
    // A hung provider must not hold the operator's request open indefinitely.
    signal: AbortSignal.timeout(15_000),
  });

  if (response.ok) return;

  const detail = await response.text().catch(() => "");
  throw new Error(
    `ZeptoMail rejected the email (HTTP ${response.status})${
      detail ? `: ${detail.slice(0, 300)}` : ""
    }`,
  );
}

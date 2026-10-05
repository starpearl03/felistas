import type { ContactMessage } from "./schema";

// Builds the email Felistas receives. Pure, so it is unit-tested. Visitor text is never treated as
// HTML: the HTML part escapes everything.

export type ContactEmail = { subject: string; text: string; html: string };

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** Keeps the subject on one line and short. */
const oneLine = (value: string, max: number) => {
  const flat = value.replace(/[\r\n\t]+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

export function buildContactEmail(msg: ContactMessage, site: string): ContactEmail {
  const from = msg.name ? `${msg.name}${msg.company ? ` (${msg.company})` : ""}` : msg.replyTo;
  const subject = oneLine(`Portfolio message from ${from}`, 120);

  const rows: [string, string][] = [
    ["From", msg.name ?? "Not given"],
    ["Company", msg.company ?? "Not given"],
    ["Reply to", msg.replyTo],
    ["About", msg.topic ?? "Not given"],
  ];

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    msg.message,
    "",
    `Sent through Dusk on ${site}. Reply to this email to answer.`,
  ].join("\n");

  const html = [
    '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#24101a">',
    '<table style="border-collapse:collapse;margin-bottom:16px">',
    ...rows.map(
      ([k, v]) =>
        `<tr><td style="padding:2px 16px 2px 0;color:#7a6470">${k}</td><td>${escapeHtml(v)}</td></tr>`,
    ),
    "</table>",
    `<p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(msg.message)}</p>`,
    `<p style="color:#7a6470;font-size:13px;margin:0">Sent through Dusk on ${escapeHtml(site)}. Reply to this email to answer.</p>`,
    "</div>",
  ].join("");

  return { subject, text, html };
}

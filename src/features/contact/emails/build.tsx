import "server-only";

import { render } from "@react-email/render";
import type { ContactMessage } from "../schema";
import { ContactConfirmation } from "./ContactConfirmation";
import { ContactNotification } from "./ContactNotification";

export type RenderedEmail = { subject: string; html: string; text: string };

/** Keeps a subject on one short line, whatever the visitor typed. */
const oneLine = (value: string, max: number) => {
  const flat = value.replace(/[\r\n\t]+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

async function renderBoth(element: React.ReactElement, subject: string): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}

/** The email Felistas receives. */
export function notificationEmail(msg: ContactMessage, site: string): Promise<RenderedEmail> {
  const who = msg.name ? `${msg.name}${msg.company ? ` (${msg.company})` : ""}` : msg.replyTo;
  return renderBoth(
    <ContactNotification msg={msg} site={site} />,
    oneLine(`Portfolio message from ${who}`, 120),
  );
}

/** The receipt the visitor receives. */
export function confirmationEmail(
  msg: ContactMessage,
  owner: string,
  site: string,
): Promise<RenderedEmail> {
  return renderBoth(
    <ContactConfirmation msg={msg} owner={owner} site={site} />,
    oneLine(`Your message to ${owner} was sent`, 120),
  );
}

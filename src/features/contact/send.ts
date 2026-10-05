import "server-only";

import { Resend } from "resend";
import { buildContactEmail } from "./email";
import type { ContactMessage } from "./schema";

export type MailConfig = { apiKey: string; to: string; from: string; site: string };

export type SendResult = { ok: true; id: string } | { ok: false; reason: string };

export type Mailer = (msg: ContactMessage, config: MailConfig) => Promise<SendResult>;

/** Sends the message to Felistas through Resend, with the visitor as reply-to. */
export const sendWithResend: Mailer = async (msg, config) => {
  const email = buildContactEmail(msg, config.site);
  try {
    const { data, error } = await new Resend(config.apiKey).emails.send({
      from: config.from,
      to: config.to,
      replyTo: msg.replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    if (error || !data) return { ok: false, reason: error?.message ?? "no response" };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
};

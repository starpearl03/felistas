import "server-only";

import { Resend } from "resend";
import { confirmationEmail, notificationEmail } from "./emails/build";
import type { ContactMessage } from "./schema";

export type MailConfig = {
  apiKey: string;
  /** Felistas's inbox */
  to: string;
  from: string;
  /** The site's host, for the email footers */
  site: string;
  /** Felistas's full name, for the visitor's confirmation */
  owner: string;
};

/** `confirmed` says whether the visitor's receipt went out too. */
export type SendResult =
  { ok: true; id: string; confirmed: boolean } | { ok: false; reason: string };

export type Mailer = (msg: ContactMessage, config: MailConfig) => Promise<SendResult>;

/**
 * Sends the message to Felistas (reply-to: the visitor), then a confirmation to the visitor
 * (reply-to: Felistas). A failed confirmation never fails the send: the message already arrived.
 */
export const sendWithResend: Mailer = async (msg, config) => {
  const resend = new Resend(config.apiKey);
  try {
    const note = await notificationEmail(msg, config.site);
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: config.to,
      replyTo: msg.replyTo,
      ...note,
    });
    if (error || !data) return { ok: false, reason: error?.message ?? "no response" };

    let confirmed = false;
    try {
      const receipt = await confirmationEmail(msg, config.owner, config.site);
      const sent = await resend.emails.send({
        from: config.from,
        to: msg.replyTo,
        replyTo: config.to,
        ...receipt,
      });
      confirmed = !sent.error && !!sent.data;
    } catch {
      confirmed = false;
    }
    return { ok: true, id: data.id, confirmed };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
};

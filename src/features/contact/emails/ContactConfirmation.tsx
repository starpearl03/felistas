import { Heading, Link, Text } from "@react-email/components";
import type { ContactMessage } from "../schema";
import { EmailFrame, label, Quote, text } from "./EmailFrame";

/** The receipt the visitor gets: their message reached Felistas, with a copy of what they sent. */
export function ContactConfirmation({
  msg,
  owner,
  site,
}: {
  msg: ContactMessage;
  /** Felistas's full name */
  owner: string;
  site: string;
}) {
  return (
    <EmailFrame
      preview={`Your message reached ${owner}`}
      footer={`You are getting this because someone used the contact form on ${site} with this address. If that wasn't you, you can ignore this email.`}
    >
      <Heading as="h1" style={{ ...text, fontSize: "20px", margin: "0 0 18px" }}>
        {msg.name ? `Thank you, ${msg.name}.` : "Thank you."}
      </Heading>
      <Text style={text}>
        Your message reached {owner}. You will get a reply at {msg.replyTo}, usually within a couple
        of days.
      </Text>
      <Text style={label}>What you sent</Text>
      <Quote>{msg.message}</Quote>
      <Text style={text}>
        Something to add? Just reply to this email, or visit{" "}
        <Link href={`https://${site}`}>{site}</Link>.
      </Text>
    </EmailFrame>
  );
}

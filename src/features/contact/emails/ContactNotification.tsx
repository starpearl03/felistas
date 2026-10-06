import { Heading, Link, Text } from "@react-email/components";
import type { ContactMessage } from "../schema";
import { EmailFrame, label, Quote, text } from "./EmailFrame";

/** The message as Felistas receives it. Reply goes straight to the visitor (reply-to). */
export function ContactNotification({ msg, site }: { msg: ContactMessage; site: string }) {
  const who = msg.name ?? msg.replyTo;
  const rows: [string, string][] = [
    ["From", msg.name ?? "Not given"],
    ["Company", msg.company ?? "Not given"],
    ["About", msg.topic ?? "Not given"],
  ];

  return (
    <EmailFrame
      preview={`New message from ${who}`}
      footer={`Sent from the contact form on ${site}. Reply to this email to answer ${who}.`}
    >
      <Heading as="h1" style={{ ...text, fontSize: "20px", margin: "0 0 18px" }}>
        New message from your portfolio
      </Heading>
      {rows.map(([k, v]) => (
        <div key={k}>
          <Text style={label}>{k}</Text>
          <Text style={text}>{v}</Text>
        </div>
      ))}
      <Text style={label}>Reply to</Text>
      <Text style={text}>
        <Link href={`mailto:${msg.replyTo}`}>{msg.replyTo}</Link>
      </Text>
      <Text style={label}>Message</Text>
      <Quote>{msg.message}</Quote>
    </EmailFrame>
  );
}

import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { PALETTE } from "@/lib/palette";

// The shared shell for the contact emails: a calm light page with the Dusk accent. Inline styles,
// because mail clients ignore stylesheets.

export const text = {
  fontFamily: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontSize: "15px",
  lineHeight: "1.6",
  color: PALETTE.ink,
  margin: "0 0 14px",
} as const;

export const label = {
  ...text,
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: PALETTE.quiet,
  margin: "0 0 4px",
} as const;

export function EmailFrame({
  preview,
  footer,
  children,
}: {
  preview: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: PALETTE.paper, margin: 0, padding: "32px 0" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: `1px solid ${PALETTE.rule}`,
            borderTop: `3px solid ${PALETTE.acc}`,
            maxWidth: "560px",
            padding: "28px 32px",
          }}
        >
          <Section>{children}</Section>
          <Hr style={{ borderColor: PALETTE.rule, margin: "24px 0 16px" }} />
          <Text style={{ ...text, fontSize: "12px", color: PALETTE.quiet, margin: 0 }}>
            {footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** The visitor's message, quoted, with line breaks kept. React escapes the text. */
export function Quote({ children }: { children: string }) {
  return (
    <Text
      style={{
        ...text,
        whiteSpace: "pre-wrap",
        borderLeft: `3px solid ${PALETTE.acc}`,
        backgroundColor: PALETTE.paper,
        padding: "12px 16px",
      }}
    >
      {children}
    </Text>
  );
}

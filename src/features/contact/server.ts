// Server-only public API of the contact feature.
export {
  type ContactDeps,
  contactLimiter,
  defaultContactDeps,
  handleContact,
  mailConfigFromEnv,
  MAX_BODY_CHARS,
} from "./handler";
export { type MailConfig, type Mailer, type SendResult, sendWithResend } from "./send";

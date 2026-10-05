// Client-safe public API of the contact feature: the shared schema and error messages.
// Server code imports the handler from "@/features/contact/server".
export {
  checkTraps,
  CONTACT_ERRORS,
  type ContactErrorCode,
  type ContactInput,
  type ContactMessage,
  type ContactResponse,
  contactSchema,
  MAX_MESSAGE_LENGTH,
  MIN_FILL_MS,
} from "./schema";

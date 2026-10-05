import { handleContact } from "@/features/contact/server";

// Sends the visitor's message to Felistas. See src/features/contact/handler.ts.
export async function POST(request: Request) {
  return handleContact(request);
}

import { handleChat } from "@/features/agent/server";

// Dusk's replies. See src/features/agent/handler.ts.
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleChat(request);
}

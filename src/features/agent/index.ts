// Client-safe public API of the agent feature: tool schemas, message types and the offline agent's
// pure pieces. Server code imports the route handler from "@/features/agent/server".
export { type AgentReply, greeting, greetingChips, respondOffline } from "./offline-agent";
export { type AgentRecord, buildRecord } from "./record";
export {
  TOOL_DESCRIPTIONS,
  toolInputSchemas,
  type ToolCall,
  type ToolIds,
  type ToolInputs,
  type ToolName,
  type ToolResult,
} from "./tools";
export type { ContactFlow, DuskMetadata, DuskUIMessage, PageContext } from "./types";

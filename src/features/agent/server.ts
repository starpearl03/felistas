// Server-only public API of the agent feature.
export {
  type ChatDeps,
  chatLimiter,
  currentFlow,
  defaultChatDeps,
  handleChat,
  HISTORY,
  lastUserText,
  MAX_INPUT_CHARS,
} from "./handler";
export { buildIndex, type Embeddings } from "./rag/build";
export { buildChunks } from "./rag/chunk";
export { EMBEDDING_DIMS, EMBEDDING_MODEL, embedDocuments, embedQuery } from "./rag/embed";
export { RAG_INDEX_FILE, ragIndex } from "./rag/load-index";
export {
  type Hit,
  MIN_BM25,
  MIN_COSINE,
  retrieve,
  retrieveLexical,
  type Retrieval,
  TOP_K,
} from "./rag/retrieve";
export { RAG_INDEX_VERSION, type RagIndex } from "./rag/types";
export { citedSources, createCitationFilter, numberSources } from "./citations";
export { liveResponse, MAX_STEPS } from "./live-agent";
export {
  COOLDOWN_MS,
  isRateLimit,
  liveBudget,
  liveModel,
  type LiveModel,
  noteModelError,
} from "./model";
export { replyResponse, writeReply } from "./stream";
export { buildSystemPrompt } from "./system-prompt";

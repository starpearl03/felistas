// Runs Dusk's tool calls on the command bus, exactly as the matching clicks would (UI-SPEC §6.1).
// Inputs are validated first: a model can ask for anything, and only real ids get through.
import { type AnyToolName, type ToolResult, toolInputSchemas } from "@/features/agent";
import {
  downloadResume,
  navigate,
  openProject,
  openRole,
  setMotion,
  showDraft,
} from "@/features/stage";
import type { CompanionConfig } from "./config";

/** Runs a page tool; the server-only search returns null. */
export function runTool(
  name: AnyToolName,
  input: unknown,
  config: CompanionConfig,
): ToolResult | null {
  // The page moves behind the phone chat too (the sphere takes the section's form) and the reply
  // shows what was opened inline, so the chat stays open (UI-SPEC §9.1)
  const schemas = toolInputSchemas(config.ids);

  switch (name) {
    case "navigate": {
      const p = schemas.navigate.safeParse(input);
      if (!p.success) return { ok: false };
      return { ok: navigate(p.data.section) };
    }
    case "open_project": {
      const p = schemas.open_project.safeParse(input);
      if (!p.success) return { ok: false };
      openProject(p.data.id, config.projects.find((x) => x.id === p.data.id)?.name);
      return { ok: true };
    }
    case "open_role": {
      const p = schemas.open_role.safeParse(input);
      if (!p.success) return { ok: false };
      openRole(p.data.role);
      return { ok: true };
    }
    case "download_resume": {
      if (!config.resume.available) return { ok: false };
      downloadResume(config.resume.href, config.resume.file);
      return { ok: true };
    }
    case "draft_message": {
      const p = schemas.draft_message.safeParse(input);
      if (!p.success) return { ok: false };
      showDraft({ replyTo: p.data.reply_to, name: p.data.name, message: p.data.message });
      return { ok: true };
    }
    case "set_motion": {
      const p = schemas.set_motion.safeParse(input);
      if (!p.success) return { ok: false };
      setMotion(p.data.level);
      return { ok: true };
    }
    case "search_record":
      return null;
  }
}

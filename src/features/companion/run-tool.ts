// Runs Dusk's tool calls on the command bus, exactly as the matching clicks would (UI-SPEC §6.1).
// Inputs are validated first: a model can ask for anything, and only real ids get through.
import { type ToolName, type ToolResult, toolInputSchemas } from "@/features/agent";
import {
  closeChat,
  downloadResume,
  navigate,
  openProject,
  openRole,
  setMotion,
  showDraft,
} from "@/features/stage";
import type { CompanionConfig } from "./config";

const isPhone = () => window.innerWidth < 900;

export function runTool(name: ToolName, input: unknown, config: CompanionConfig): ToolResult {
  const schemas = toolInputSchemas(config.ids);
  // Moving the page closes the phone sheet so the visitor sees where Dusk went
  const reveal = () => {
    if (isPhone()) closeChat();
  };

  switch (name) {
    case "navigate": {
      const p = schemas.navigate.safeParse(input);
      if (!p.success) return { ok: false };
      reveal();
      return { ok: navigate(p.data.section) };
    }
    case "open_project": {
      const p = schemas.open_project.safeParse(input);
      if (!p.success) return { ok: false };
      reveal();
      openProject(p.data.id, config.projects.find((x) => x.id === p.data.id)?.name);
      return { ok: true };
    }
    case "open_role": {
      const p = schemas.open_role.safeParse(input);
      if (!p.success) return { ok: false };
      reveal();
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
  }
}

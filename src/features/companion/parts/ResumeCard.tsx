import { Download } from "@/components/ui/icons";
import { TextLink } from "@/components/ui/TextLink";
import type { CompanionConfig } from "../config";

/** The resume as a file, with a real download link (UI-SPEC §6). */
export function ResumeCard({ resume }: { resume: CompanionConfig["resume"] }) {
  return (
    <div className="grid gap-2.5 border-l border-acc py-3 pl-3.5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-[42px] w-[34px] place-items-end justify-center rounded-md bg-soft pb-[5px] font-mono text-[9px] text-acc"
        >
          PDF
        </span>
        <span>
          <b className="block text-[13.5px] font-medium">{resume.file}</b>
          <span className="text-xs text-muted">
            {["PDF", resume.size, resume.updated && `updated ${resume.updated}`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </div>
      <TextLink href={resume.href} download={resume.file} accent icon={<Download />}>
        Download
      </TextLink>
    </div>
  );
}

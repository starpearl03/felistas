import type { TextPart } from "@/features/content";

/** Renders text parts, with `*emphasised*` words in accent italic. */
export function Emphasis({ parts }: { parts: TextPart[] }) {
  return parts.map((part, i) =>
    part.em ? (
      <em key={i} className="text-acc">
        {part.text}
      </em>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
}

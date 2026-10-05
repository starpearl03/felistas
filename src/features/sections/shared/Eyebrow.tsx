/** The section label: accent word, muted detail. `data-anchor` is where the sphere's thread lands (P4). */
export function Eyebrow({ label, detail }: { label: string; detail?: string }) {
  return (
    <p
      data-anchor
      className="mb-5 flex items-center gap-3 font-mono text-[11px] tracking-[.18em] text-acc uppercase"
    >
      {label}
      {detail ? <span className="text-muted">/ {detail}</span> : null}
    </p>
  );
}

import { ImageResponse } from "next/og";
import { loadSite } from "@/features/content/server";
import { PALETTE, sphereStill } from "@/lib/palette";

export const alt = "Portfolio share card: the Dusk glyph sphere beside the name, role and line";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SPHERE = 250; // radius in px

/** The share card: the glyph sphere on the left, name, role and line on the right. */
export default async function OpengraphImage() {
  const { profile } = await loadSite();
  const glyphs = sphereStill(340).sort((a, b) => a.z - b.z);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: PALETTE.bg,
        color: PALETTE.fg,
        position: "relative",
      }}
    >
      {glyphs.map((g, i) => {
        const near = (g.z + 1) / 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 330 + g.x * SPHERE,
              top: 315 + g.y * SPHERE,
              fontSize: 13 + near * 13,
              color: near > 0.72 ? PALETTE.acc2 : PALETTE.acc,
              opacity: 0.15 + near * 0.85,
            }}
          >
            {g.char}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 660,
          top: 0,
          bottom: 0,
          right: 70,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 4, color: PALETTE.acc }}>
          {profile.role.toUpperCase()}
        </div>
        <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1 }}>{profile.fullName}</div>
        <div style={{ fontSize: 30, lineHeight: 1.35, color: PALETTE.fg2 }}>{profile.line}</div>
        <div style={{ fontSize: 22, color: PALETTE.muted }}>
          {`Ask Dusk anything · ${profile.domain}`}
        </div>
      </div>
    </div>,
    size,
  );
}

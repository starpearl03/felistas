import { ImageResponse } from "next/og";
import { PALETTE, sphereStill } from "@/lib/palette";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The favicon: a tiny Dusk sphere, dots instead of glyphs so it stays legible at 16px. */
export default function Icon() {
  const dots = sphereStill(90).sort((a, b) => a.z - b.z);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: PALETTE.bg,
        borderRadius: 14,
      }}
    >
      {dots.map((d, i) => {
        const near = (d.z + 1) / 2;
        const s = 2 + near * 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 32 + d.x * 24 - s / 2,
              top: 32 + d.y * 24 - s / 2,
              width: s,
              height: s,
              borderRadius: s,
              background: near > 0.7 ? PALETTE.acc2 : PALETTE.acc,
              opacity: 0.2 + near * 0.8,
            }}
          />
        );
      })}
    </div>,
    size,
  );
}

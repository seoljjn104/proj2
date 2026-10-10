import { ImageResponse } from "next/og";

export const alt = "SkillGRID — direct 1:1 peer-to-peer skill exchange";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f172a",
          padding: "80px",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "#0f766e",
              fontSize: 36,
              fontWeight: 600,
            }}
          >
            S
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 600, letterSpacing: -1 }}>
            SkillGRID
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            <span>Teach what you know.</span>
            <span style={{ color: "#5eead4" }}>Learn what you need.</span>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#94a3b8" }}>
            Direct 1:1 peer-to-peer skill exchange
          </div>
        </div>
      </div>
    ),
    size,
  );
}

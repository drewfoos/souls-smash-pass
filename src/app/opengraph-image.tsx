import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Elden Smash — Smash or Pass Elden Ring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #111108 50%, #0d0a0a 100%)",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(240,192,64,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            color: "#f0c040",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: 16,
            textShadow: "0 0 60px rgba(240,192,64,0.4)",
          }}
        >
          ELDEN SMASH
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(220,210,190,0.7)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          Smash or Pass · Elden Ring
        </div>

        {/* CTA strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            fontSize: 22,
            color: "rgba(220,210,190,0.45)",
            letterSpacing: "0.15em",
          }}
        >
          <span>500+ Characters</span>
          <span style={{ color: "rgba(240,192,64,0.4)" }}>·</span>
          <span>Ranni · Malenia · Radahn</span>
          <span style={{ color: "rgba(240,192,64,0.4)" }}>·</span>
          <span>Touch Grace</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

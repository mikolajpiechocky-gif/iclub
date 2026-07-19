// Ikona na ekran główny iOS (apple-touch-icon) — gradient marki + „i".
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e11d74 0%, #b5179e 100%)",
          color: "#ffffff",
          fontSize: 128,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: "-3px",
        }}
      >
        i
      </div>
    ),
    { ...size }
  );
}

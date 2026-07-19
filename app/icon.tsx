// Ikona aplikacji (favicon + Android) generowana kodem — gradient marki + „i".
import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 360,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: "-8px",
        }}
      >
        i
      </div>
    ),
    { ...size }
  );
}

// Ikona aplikacji (favicon + Android) — logo iClub na ciemnym tle marki.
// Odczyt logo przez fs w czasie budowania (ikona jest generowana statycznie).
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public", "logo-iclub.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b10",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={412} height={139} style={{ objectFit: "contain" }} alt="iClub" />
      </div>
    ),
    { ...size }
  );
}

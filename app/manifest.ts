// Manifest PWA — dzięki niemu „Dodaj do ekranu głównego" daje ikonę,
// nazwę i pełnoekranowy wygląd jak natywna aplikacja.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iClub Management",
    short_name: "iClub",
    description: "System operacyjny firmy iClub — namioty imprezowe i sprzęt eventowy.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08090d",
    theme_color: "#e11d74",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

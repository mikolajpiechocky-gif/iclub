// =====================================================================
// iClub Management — współdzielony komponent ikon (proste SVG, bez bibliotek).
// Użycie: <Icon name="calendar" className="h-5 w-5" />
// Ikony rysowane stroke="currentColor" — kolor dziedziczy z tekstu.
// =====================================================================

import type { SVGProps } from "react";

export type IconName =
  | "home" | "calendar" | "inbox" | "bookmark" | "clipboard" | "truck"
  | "users" | "box" | "cube" | "coins" | "card" | "chart" | "doc" | "gear"
  | "check" | "chevron-right" | "chevron-left" | "phone" | "navigation"
  | "camera" | "warning" | "plus" | "x" | "menu" | "signature" | "more"
  | "wifi" | "wifi-off" | "refresh" | "pen"
  | "wind" | "sun" | "droplet" | "search";

// d-ścieżki dla viewBox 0 0 24 24, stroke.
const PATHS: Record<IconName, string> = {
  home: "M3 11.5 12 4l9 7.5M5 10v10h14V10",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  inbox: "M4 13h4l2 3h4l2-3h4M4 13 6 5h12l2 8v6H4z",
  bookmark: "M6 4h12v16l-6-4-6 4z",
  clipboard: "M9 4h6v3H9zM7 5H5v15h14V5h-2M9 12h6M9 16h6",
  truck: "M3 6h11v9H3zM14 9h4l3 3v3h-7M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5",
  box: "M4 8 12 4l8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8",
  cube: "M12 3 4 7v10l8 4 8-4V7zM12 3v18M4 7l8 4 8-4",
  coins: "M8 8a5 3 0 1 0 0-6 5 3 0 0 0 0 6M3 5v6c0 1.7 2.2 3 5 3s5-1.3 5-3V5M13 11c0 1.7 2.2 3 5 3s3-1.3 3-3",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M9 12h6M9 16h6",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19 12l2-1-1-3-2 .5-2-1.5V5h-4v2l-2 1.5L6 8 5 11l2 1-2 1 1 3 2-.5 2 1.5V21h4v-2l2-1.5 2 .5 1-3z",
  check: "M5 12.5 10 17 19 7",
  "chevron-right": "M9 6l6 6-6 6",
  "chevron-left": "M15 6l-6 6 6 6",
  phone: "M5 4h4l1 5-2 1a11 11 0 0 0 5 5l1-2 5 1v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  navigation: "M3 11 21 3l-8 18-2-7z",
  camera: "M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  warning: "M12 4 2 20h20zM12 10v5M12 17.5v.5",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6 6 18",
  menu: "M4 7h16M4 12h16M4 17h16",
  signature: "M3 17c3 0 3-8 6-8s0 6 3 6 3-10 6-10M3 20h18",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  wifi: "M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01",
  "wifi-off": "M2 8.5a15 15 0 0 1 6-3.8M22 8.5a15 15 0 0 0-6-3.8M5 12a10 10 0 0 1 3-2M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18",
  refresh: "M20 11a8 8 0 1 0-.5 4M20 5v6h-6",
  pen: "M4 20h4L20 8l-4-4L4 16zM14 6l4 4",
  wind: "M4 8h10a2.5 2.5 0 1 0-2.5-2.5M4 16h13a2.5 2.5 0 1 1-2.5 2.5M4 12h8",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19",
  droplet: "M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15M21 21l-5.4-5.4",
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

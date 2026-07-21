// Avatar użytkownika: zdjęcie (jeśli ustawione) albo inicjały na gradiencie.
function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "U") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name, url, size = 44, className = "" }: { name: string; url?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size } as const;
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className={`flex-none rounded-[13px] object-cover ${className}`} style={style} />
    );
  }
  return (
    <span
      aria-label={name}
      className={`flex flex-none items-center justify-center rounded-[13px] font-bold text-white ${className}`}
      style={{ ...style, background: "linear-gradient(135deg,#7c3aed,#e11d74)", fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

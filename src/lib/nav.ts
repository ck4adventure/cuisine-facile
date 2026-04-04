export type NavLink = {
  href: string;
  dirLabel?: string;  // overrides "← Previous" / "Next →"
  titleFr: string;
  titleEn?: string;
  num?: string;       // e.g. "N° 8"
} | null;

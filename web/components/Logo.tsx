/** Sloth Butler mark: sloth face with eye mask and a bow tie, on a yellow disc. */
export function Logo({ size = 40, title = "Sloth Butler" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
      <circle cx="32" cy="32" r="32" fill="#F5DF6E" />
      <ellipse cx="32" cy="29" rx="20" ry="17" fill="#8A6A50" />
      <ellipse cx="32" cy="30" rx="16.5" ry="13.5" fill="#EAD6B8" />
      <path d="M17 27c2-5 8-6 11-2 1 3-2 7-6 7s-6-2-5-5z" fill="#5A4031" />
      <path d="M47 27c-2-5-8-6-11-2-1 3 2 7 6 7s6-2 5-5z" fill="#5A4031" />
      <circle cx="22.5" cy="27.5" r="2.2" fill="#1C1B1A" />
      <circle cx="41.5" cy="27.5" r="2.2" fill="#1C1B1A" />
      <ellipse cx="32" cy="33" rx="3" ry="2" fill="#3A2A20" />
      <path d="M28 37.5q4 3 8 0" fill="none" stroke="#3A2A20" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M32 50l-10-5.5v11z M32 50l10-5.5v11z" fill="#8E84E3" />
      <circle cx="32" cy="50" r="3" fill="#7268C0" />
    </svg>
  );
}

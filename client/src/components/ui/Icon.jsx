const PATHS = {
  landmark: (
    <>
      <path d="M3 21h18" />
      <path d="M4 21V10M9 21V10M15 21V10M20 21V10" />
      <path d="M2 10l10-6 10 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 18l6-6-6-6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 5-5" />
    </>
  ),
  alertCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.2v.1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.6-6 6-6s6 2.7 6 6" />
      <path d="M16 4.3c1.5.5 2.5 1.9 2.5 3.5S17.5 10.8 16 11.3" />
      <path d="M20.5 20c0-2.7-1.7-5-4-5.8" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  logOut: (
    <>
      <path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0112 5c6.4 0 10 7 10 7a17.8 17.8 0 01-3.4 4.3M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7c1.4 0 2.6-.3 3.7-.8" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </>
  ),
  phone: (
    <path d="M5.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a1.5 1.5 0 01-1.6 1.5A17 17 0 014 5.1 1.5 1.5 0 015.5 3.5z" />
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M7.5 10.5V7a4.5 4.5 0 019 0v3.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7.5A2.5 2.5 0 015.5 5h11A2.5 2.5 0 0119 7.5V9H5.5A2.5 2.5 0 013 6.5" />
      <rect x="3" y="9" width="18" height="11" rx="2.2" />
      <circle cx="16" cy="14.5" r="1.4" />
    </>
  ),
  arrowLeftRight: (
    <>
      <path d="M4 9h13" />
      <path d="M13.5 4.5L17 9l-3.5 4.5" />
      <path d="M20 15H7" />
      <path d="M10.5 10.5L7 15l3.5 4.5" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 4v13" />
      <path d="M6.5 12L12 17.5 17.5 12" />
      <path d="M5 20.5h14" />
    </>
  ),
  banknote: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.2v.1M18 14.7v.1" />
    </>
  ),
  trendingUp: (
    <>
      <path d="M3 16.5l6.2-6.2 4 4L21 6.5" />
      <path d="M15 6.5H21v6" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5V5.5a2 2 0 00-2-2h-9a2 2 0 00-2 2v9a2 2 0 002 2h3" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="11" height="18" rx="1" />
      <path d="M15 21v-6h5v6" />
      <path d="M7.5 7h2M7.5 11h2M7.5 15h2" />
    </>
  ),
  layout: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M9 9.5V21" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 12.5h5l1.5 3h4l1.5-3h5" />
      <rect x="3.5" y="6" width="17" height="14" rx="2" />
    </>
  ),
  spinner: (
    <path d="M12 3a9 9 0 109 9" />
  ),
};

export default function Icon({ name, size = 20, strokeWidth = 1.8, className, ...rest }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {path}
    </svg>
  );
}

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IconBrain = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4.5a3 3 0 0 0-5.6-1.5A3.5 3.5 0 0 0 3 7a3.5 3.5 0 0 0 .6 6A3.5 3.5 0 0 0 7 19a3 3 0 0 0 5 1.5Z" />
    <path d="M12 4.5a3 3 0 0 1 5.6-1.5A3.5 3.5 0 0 1 21 7a3.5 3.5 0 0 1-.6 6A3.5 3.5 0 0 1 17 19a3 3 0 0 1-5 1.5Z" />
    <path d="M12 4.5v16" />
  </svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4.5v15l12-7.5Z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconQuiz = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.3 9.3a2.8 2.8 0 1 1 3.8 2.6c-.7.3-1.1.9-1.1 1.6v.5" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" />
  </svg>
);
export const IconLeaf = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15" />
    <path d="M5 19 13 11" />
  </svg>
);
export const IconBook = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
    <path d="M4 19V5" />
    <path d="M8 7h7" />
  </svg>
);
export const IconExpand = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);
export const IconShrink = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </svg>
);
export const IconReset = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3 4v4.5h4.5" />
  </svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const IconRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
export const IconMenu = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconCube = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9Z" />
    <path d="M12 12 20 7.5M12 12 4 7.5M12 12v9" />
  </svg>
);
export const IconSquare = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M9 4v16" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5 10 17.5 19.5 7" />
  </svg>
);
export const IconX = IconClose;
export const IconHome = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 11 12 4l8 7v9H4Z" />
    <path d="M10 20v-5h4v5" />
  </svg>
);
export const IconExternal = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

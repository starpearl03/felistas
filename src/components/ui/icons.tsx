import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  "aria-hidden": true,
} as const;

export const ArrowRight = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const Download = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />
  </svg>
);

export const Mail = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="2" y="3.5" width="12" height="9" rx="1.2" />
    <path d="M2.5 4.5 8 8.8l5.5-4.3" />
  </svg>
);

export const Send = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 2 7 9M14 2l-4.5 12L7 9 2 6.5 14 2Z" />
  </svg>
);

/** Brand marks are filled shapes, drawn in the text colour */
const mark = { viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": true } as const;

export const GitHub = (props: IconProps) => (
  <svg {...mark} {...props}>
    <path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.23 1.88.87 2.34.67.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z" />
  </svg>
);

export const LinkedIn = (props: IconProps) => (
  <svg {...mark} {...props}>
    <path d="M13.6 1H2.4C1.6 1 1 1.6 1 2.4v11.2c0 .8.6 1.4 1.4 1.4h11.2c.8 0 1.4-.6 1.4-1.4V2.4c0-.8-.6-1.4-1.4-1.4ZM5.2 12.9H3.1V6.2h2.1v6.7ZM4.1 5.3a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm8.8 7.6h-2.1V9.6c0-.8 0-1.8-1.1-1.8s-1.3.9-1.3 1.8v3.3H6.3V6.2h2v.9c.3-.5 1-1.1 2.1-1.1 2.2 0 2.6 1.5 2.6 3.4v3.5Z" />
  </svg>
);

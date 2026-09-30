// Small inline SVG icons (stroke = currentColor), so the UI needs no icon
// package. Each takes a className for sizing/colour.
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  viewBox: "0 0 24 24",
};

export const PlusIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const TrashIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>
);
export const LogoutIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M10 17l5-5-5-5M15 12H3M21 3v18" /></svg>
);
export const BackIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);
export const EditIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const LinkIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
);
export const PhotoIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
);
export const CameraIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const RestoreIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
);
export const XIcon = ({ className = "h-5 w-5" }: P) => (
  <svg className={className} {...base}><path d="M18 6 6 18M6 6l12 12" /></svg>
);

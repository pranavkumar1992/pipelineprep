import type { SVGProps } from "react";

/**
 * A pipeline: two inputs converging into one. Decorative by default; pass
 * `title` to expose it to assistive technology.
 */
export function Logo({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="12" r="2.5" fill="currentColor" />
      <path d="M7.5 6H9a3 3 0 0 1 3 3v0a3 3 0 0 0 3 3h1" />
      <path d="M7.5 18H9a3 3 0 0 0 3-3v0a3 3 0 0 1 3-3h1" />
    </svg>
  );
}

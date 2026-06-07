import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

export const Ic = {
  photo: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="M3 16.5l4.5-4 3.5 3 3.5-4L21 17" />
    </svg>
  ),
  voice: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M4 12v0M7 8v8M10 5v14M14 8v8M17 10.5v3M20 11.5v1" />
    </svg>
  ),
  note: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M5 6h14M5 10h14M5 14h9M5 18h6" />
    </svg>
  ),
  collection: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <rect x="4" y="4" width="7" height="7" rx="0.5" />
      <rect x="13" y="4" width="7" height="7" rx="0.5" />
      <rect x="4" y="13" width="7" height="7" rx="0.5" />
      <rect x="13" y="13" width="7" height="7" rx="0.5" />
    </svg>
  ),
  rule: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M6 4v16M18 4v16M6 8h2M6 12h3M6 16h2M16 8h2M15 12h3M16 16h2" />
    </svg>
  ),
  feeling: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 14s1 1.5 3 1.5 3-1.5 3-1.5M9.5 9.5v.5M14.5 9.5v.5" />
    </svg>
  ),
  reaction: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 4l2.1 4.5 4.9.7-3.5 3.4.8 4.9L12 15.1 7.7 17.5l.8-4.9L5 9.2l4.9-.7z" />
    </svg>
  ),
  search: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...p}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  ),
  back: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  close: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  check: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  ),
  mic: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  ),
  camera: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  tag: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" />
    </svg>
  ),
  chevron: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  arrowOut: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  ),
}

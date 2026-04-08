'use client'

function SvgIcon({ size = 20, strokeWidth = 2, className, children }) {
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
    >
      {children}
    </svg>
  )
}

export function BallIcon(props) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3l2.8 2 3.4-.2.9 3.2 2.2 2-1.4 3.1.5 3.4-3.1 1.3L15 21l-3-1.6L9 21l-2.3-2.5-3.1-1.3.5-3.4L2.7 10l2.2-2 .9-3.2 3.4.2L12 3z" />
    </SvgIcon>
  )
}

export function CollectionIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M8 6h11" />
      <path d="M8 12h11" />
      <path d="M8 18h11" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </SvgIcon>
  )
}

export function SearchIcon(props) {
  return (
    <SvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </SvgIcon>
  )
}

export function ChatIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" />
    </SvgIcon>
  )
}

export function TrophyIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4" />
      <path d="M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </SvgIcon>
  )
}

export function CloseIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </SvgIcon>
  )
}

export function ArrowDownIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M12 4v16" />
      <path d="m7 15 5 5 5-5" />
    </SvgIcon>
  )
}

export function ArrowUpIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M12 20V4" />
      <path d="m17 9-5-5-5 5" />
    </SvgIcon>
  )
}

export function BellIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M15 17H5l2-2V9a5 5 0 1 1 10 0v6l2 2h-4" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </SvgIcon>
  )
}

export function SparkIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
      <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </SvgIcon>
  )
}

export function CheckIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="m5 12 4.2 4.2L19 7.5" />
    </SvgIcon>
  )
}

interface CircularProgressProps {
  progress: number // 0-100 percentage
  size?: number // width and height in pixels, defaults to 16
  className?: string
}

export function CircularProgress({
  progress,
  size = 16,
  className = "",
}: CircularProgressProps) {
  // Calculate the stroke-dasharray and stroke-dashoffset for the progress arc
  const radius = 6 // radius for the progress path
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      {/* Background circle */}
      <path
        d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8Z"
        fill="#D6E0EA"
      />
      {/* Progress arc */}
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        stroke="#464D53"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
        style={{
          transition: "stroke-dashoffset 0.3s ease-in-out",
        }}
      />
    </svg>
  )
}

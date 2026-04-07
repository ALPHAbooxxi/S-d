'use client'

import styles from './ProgressRing.module.css'

export default function ProgressRing({ progress, size = 120, strokeWidth = 10, label }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={styles.container} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--gray-100)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#yellowGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={styles.progressCircle}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--svd-yellow-600)" />
            <stop offset="100%" stopColor="var(--svd-yellow-400)" />
          </linearGradient>
        </defs>
      </svg>
      <div className={styles.inner}>
        <span className={styles.percentage}>{Math.round(progress)}%</span>
        {label && <span className={styles.label}>{label}</span>}
      </div>
    </div>
  )
}

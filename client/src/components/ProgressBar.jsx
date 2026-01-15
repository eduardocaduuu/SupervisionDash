import React from 'react'

export default function ProgressBar({
  label,
  value,
  max = 100,
  showValue = true,
  variant = 'default',
  ticks = 10,
  formatValue = (v) => `${v.toFixed(1)}%`
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  const variantClass = variant !== 'default' ? `progress-bar--${variant}` : ''

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        {showValue && (
          <span className="progress-value" style={{ color: getColorForVariant(variant) }}>
            {formatValue(value)}
          </span>
        )}
      </div>
      <div className={`progress-bar ${variantClass}`}>
        <div
          className="progress-bar__fill"
          style={{ width: `${percent}%` }}
        />
        <div className="progress-bar__ticks">
          {Array.from({ length: ticks }).map((_, i) => (
            <div key={i} className="progress-bar__tick" />
          ))}
        </div>
      </div>
    </div>
  )
}

function getColorForVariant(variant) {
  const colors = {
    default: 'var(--color-neon-primary)',
    cyan: 'var(--color-neon-secondary)',
    pink: 'var(--color-neon-accent)',
    warning: 'var(--color-neon-warning)',
    danger: 'var(--color-neon-danger)'
  }
  return colors[variant] || colors.default
}

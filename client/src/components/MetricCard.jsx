import React from 'react'

export default function MetricCard({
  label,
  value,
  subtext,
  variant = 'default',
  icon: Icon,
  format = 'number'
}) {
  const variantClass = variant !== 'default' ? `metric-card--${variant}` : ''

  const formatValue = (val) => {
    if (format === 'currency') {
      return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
    if (format === 'number') {
      return Number(val).toLocaleString('pt-BR')
    }
    return val
  }

  return (
    <div className={`metric-card ${variantClass}`}>
      <div className="metric-card__label">
        {Icon && <Icon size={14} style={{ marginRight: '6px' }} />}
        {label}
      </div>
      <div className="metric-card__value">{formatValue(value)}</div>
      {subtext && <div className="metric-card__sub">{subtext}</div>}
    </div>
  )
}

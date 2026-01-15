import React from 'react'
import { AlertTriangle, Zap, CheckCircle, Info } from 'lucide-react'

const chipConfig = {
  critical: { icon: AlertTriangle, className: 'alert-chip--critical' },
  warning: { icon: AlertTriangle, className: 'alert-chip--warning' },
  success: { icon: CheckCircle, className: 'alert-chip--success' },
  info: { icon: Info, className: 'alert-chip--info' },
  boost: { icon: Zap, className: 'alert-chip--warning' }
}

export default function AlertChip({ type = 'info', children }) {
  const config = chipConfig[type] || chipConfig.info
  const Icon = config.icon

  return (
    <span className={`alert-chip ${config.className}`}>
      <Icon size={12} />
      {children}
    </span>
  )
}

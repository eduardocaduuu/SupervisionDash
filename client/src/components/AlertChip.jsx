import React from 'react'
import { AlertTriangle, Zap, CheckCircle, Info, Flame, TrendingUp, Rocket, Trophy } from 'lucide-react'

const chipConfig = {
  critical: { icon: AlertTriangle, className: 'alert-chip--critical' },    // Vermelho
  warning: { icon: Flame, className: 'alert-chip--warning' },              // Laranja
  track: { icon: TrendingUp, className: 'alert-chip--track' },             // Verde
  almost: { icon: Rocket, className: 'alert-chip--almost' },               // Ciano
  levelup: { icon: Zap, className: 'alert-chip--levelup' },                // Roxo/Magenta
  success: { icon: Trophy, className: 'alert-chip--success' },             // Azul
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

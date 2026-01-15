import React from 'react'
import { Award, Star, Gem, Crown, Sparkles } from 'lucide-react'

const segmentConfig = {
  Bronze: { icon: Award, className: 'badge--bronze' },
  Prata: { icon: Star, className: 'badge--prata' },
  Ouro: { icon: Gem, className: 'badge--ouro' },
  Diamante: { icon: Crown, className: 'badge--diamante' },
  Elite: { icon: Sparkles, className: 'badge--elite' }
}

export default function BadgeSegment({ segment }) {
  const config = segmentConfig[segment] || segmentConfig.Bronze
  const Icon = config.icon

  return (
    <span className={`badge ${config.className}`}>
      <Icon size={12} />
      {segment}
    </span>
  )
}

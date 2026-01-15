import React from 'react'
import { Award, Star, Gem, Crown, Sparkles, Circle, Hexagon } from 'lucide-react'

const segmentConfig = {
  Bronze:    { icon: Circle,   className: 'badge--bronze' },
  Prata:     { icon: Award,    className: 'badge--prata' },
  Ouro:      { icon: Star,     className: 'badge--ouro' },
  Platina:   { icon: Gem,      className: 'badge--platina' },
  Rubi:      { icon: Hexagon,  className: 'badge--rubi' },
  Esmeralda: { icon: Crown,    className: 'badge--esmeralda' },
  Diamante:  { icon: Sparkles, className: 'badge--diamante' }
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

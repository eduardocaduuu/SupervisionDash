import React from 'react'

export default function Panel({
  children,
  title,
  variant = 'default',
  className = '',
  headerRight,
  noPadding = false
}) {
  const variantClass = variant !== 'default' ? `panel--${variant}` : ''

  return (
    <div className={`panel ${variantClass} ${className}`}>
      {title && (
        <div className="panel__header">
          <span className="panel__title">{title}</span>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'panel__body'}>
        {children}
      </div>
    </div>
  )
}

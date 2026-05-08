/**
 * Replicates the Framer GradientBorderBox technique:
 * outer div = gradient background + padding (the "border")
 * inner div = solid background masking the center, revealing only the gradient edges
 */
export default function GradientBorderBox({
  borderWidth = 2,
  borderRadius = 32,
  angle = 135,
  stops = [],
  boxShadow,
  className = '',
  innerClassName = '',
  children,
}) {
  const gradient = `linear-gradient(${angle}deg, ${
    [...stops]
      .sort((a, b) => a.position - b.position)
      .map(s => `${s.color} ${s.position}%`)
      .join(', ')
  })`

  return (
    <div
      className={className}
      style={{ background: gradient, padding: borderWidth, borderRadius, boxShadow }}
    >
      <div
        className={innerClassName}
        style={{ borderRadius: Math.max(0, borderRadius - borderWidth), height: '100%' }}
      >
        {children}
      </div>
    </div>
  )
}

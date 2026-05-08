import { motion } from 'framer-motion'

/**
 * Drop this anywhere as a fixed full-page background layer.
 * z-index is negative so all page content sits above it.
 */
export function FloatingPathsBackground({ className = '', style = {} }) {
  return (
    <div
      className={`fixed inset-0 w-full h-full pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 0, ...style }}
    >
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  )
}

function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }))

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 696 316" fill="none">
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  )
}

/**
 * Animated floating-path background banner.
 *
 * Props:
 *   title    – text to animate letter-by-letter
 *   subtitle – optional muted subtext
 *   cta      – optional JSX node (button / link) rendered below subtitle
 *   className – extra classes (use to control height, rounding, etc.)
 */
export function BackgroundPaths({
  title = 'Background Paths',
  subtitle,
  cta,
  className = '',
}) {
  const words = title.split(' ')

  return (
    <div className={`relative w-full flex items-center justify-center overflow-hidden bg-[#111111] text-white/25 ${className}`}>
      {/* Animated path layers */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-6 md:px-12 py-12 md:py-16 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          {/* Animated title */}
          <h2 className="font-headline text-3xl md:text-5xl font-bold text-white tracking-tighter leading-tight">
            {words.map((word, wi) => (
              <span key={wi} className="inline-block mr-3 last:mr-0">
                {word.split('').map((letter, li) => (
                  <motion.span
                    key={`${wi}-${li}`}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wi * 0.10 + li * 0.03,
                      type: 'spring',
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h2>

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              className="text-white/55 text-base md:text-lg font-medium"
            >
              {subtitle}
            </motion.p>
          )}

          {cta && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.7 }}
            >
              {cta}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

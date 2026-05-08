import { useRef, useEffect } from 'react'

const COLORS = ['#4285F4', '#EA4335', '#C48502', '#34A853']
const COUNT  = 300

function makeParticle(W, H) {
  const cx    = W / 2
  const cy    = H / 2
  const angle = Math.random() * Math.PI * 2
  const r     = Math.sqrt(Math.random()) * Math.hypot(cx, cy)

  return {
    x:       cx + Math.cos(angle) * r,
    y:       cy + Math.sin(angle) * r,
    angle,
    speed:   0.18 + Math.random() * 0.32,
    color:   COLORS[Math.floor(Math.random() * 4)],
    len:     5  + Math.random() * 9,
    thick:   1.4 + Math.random() * 1.4,
    opacity: Math.random(),
  }
}

function respawn(p, W, H) {
  const cx    = W / 2
  const cy    = H / 2
  const angle = Math.random() * Math.PI * 2
  const r     = Math.random() * 60

  p.x       = cx + Math.cos(angle) * r
  p.y       = cy + Math.sin(angle) * r
  p.angle   = Math.atan2(p.y - cy, p.x - cx)
  p.speed   = 0.18 + Math.random() * 0.32
  p.opacity = 0
}

export default function HeroCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const cvs = canvasRef.current
    const ctx = cvs.getContext('2d')

    let W, H
    let particles = []
    let raf

    function init() {
      W = cvs.width  = window.innerWidth
      H = cvs.height = window.innerHeight
      particles = Array.from({ length: COUNT }, () => makeParticle(W, H))
    }

    function frame() {
      ctx.clearRect(0, 0, W, H)

      for (const p of particles) {
        p.x += Math.cos(p.angle) * p.speed
        p.y += Math.sin(p.angle) * p.speed

        if (p.opacity < 1) p.opacity = Math.min(1, p.opacity + 0.007)

        if (p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) {
          respawn(p, W, H)
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(Math.atan2(Math.sin(p.angle) * p.speed, Math.cos(p.angle) * p.speed))
        ctx.globalAlpha = p.opacity
        ctx.fillStyle   = p.color
        ctx.fillRect(-p.len / 2, -p.thick / 2, p.len, p.thick)
        ctx.restore()
      }

      raf = requestAnimationFrame(frame)
    }

    init()
    frame()

    const onResize = () => { init() }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        width:         '100%',
        height:        '100%',
        zIndex:        -1,
        pointerEvents: 'none',
        display:       'block',
      }}
    />
  )
}

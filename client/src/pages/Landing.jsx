import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Lenis from 'lenis'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useTheme } from '../context/useTheme'
import logo from '../assets/logo.png'
import groupcardA from '../assets/groupcardA.png'
import groupcardB from '../assets/groupcardB.jpg'
import imageforcard1 from '../assets/imageforcard1.png'
import imageforcard2 from '../assets/imageforcard2.png'
import imageforcard3 from '../assets/imageforcard3.png'
import imageforcard4 from '../assets/imageforcard4.png'
import featureimage1 from '../assets/featureimage1.png'
import featureimage2 from '../assets/featureimage2.png'
import HeroCanvas from '../components/HeroCanvas'

// ─── shared animation variants ───────────────────────────────────────────────
const fadeUp   = { hidden: { opacity: 0, y: 48 }, visible: { opacity: 1, y: 0 } }
const fadeLeft = { hidden: { opacity: 0, x: -60 }, visible: { opacity: 1, x: 0 } }
const fadeRight= { hidden: { opacity: 0, x:  60 }, visible: { opacity: 1, x: 0 } }
const VP       = { once: true, margin: '-80px' }

const CARD_GROUPS = [
  {
    id: 'A',
    tag: 'Parse & Predict',
    image: groupcardA,
    title: 'From Resume to Prediction',
    desc: 'Drop your PDF and get ML-powered placement outcomes in seconds.',
    steps: [
      { label: 'NLP Pipeline', img: imageforcard1, title: 'Resume Intelligence', desc: 'Skills, projects, and ATS signals extracted directly from your PDF.' },
      { label: '3 ML Models', img: imageforcard2, title: 'Role, Tier & Salary', desc: 'Random Forest models predict your outcome in one pass.' },
    ],
  },
  {
    id: 'B',
    tag: 'Gap Analysis',
    image: groupcardB,
    title: 'Know and Fix Your Gaps',
    desc: 'Benchmark your profile against industry standards and get a targeted action plan.',
    steps: [
      { label: 'Skill Gap Score', img: imageforcard3, title: 'Know What\'s Missing', desc: 'Domain-level gap score across DSA, Web, ML, System Design.' },
      { label: 'Roadmap', img: imageforcard4, title: 'Fix It Fast', desc: 'Specific targets, projects, and drills based on your exact gaps.' },
    ],
  },
]

export default function Landing() {
  const containerRef = useRef(null)
  const lenisRef     = useRef(null)
  const rafRef       = useRef(null)
  const { theme, setTheme } = useTheme()
  const previousThemeRef = useRef(null)

  const LINE1      = 'Know Your Placement Readiness'
  const LINE2      = 'Before the Drive'
  const FULL_TEXT  = LINE1 + '\n' + LINE2

  const [displayed,   setDisplayed]   = useState('')
  const [typingDone,  setTypingDone]  = useState(false)
  const [cursorPhase, setCursorPhase] = useState('typing')
  const [blinkOn,     setBlinkOn]     = useState(true)
  const [burstOrigin, setBurstOrigin] = useState(null)
  const cursorRef      = useRef(null)
  const burstCanvasRef = useRef(null)

  const GCOLORS = ['#4285F4', '#EA4335', '#C48502', '#34A853']

  const [activeCard, setActiveCard] = useState(null)
  const [isMobile,   setIsMobile]   = useState(false)

  useEffect(() => {
    previousThemeRef.current = theme
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    if (theme !== 'light') {
      setTheme('light')
    }

    return () => {
      if (previousThemeRef.current && previousThemeRef.current !== 'light') {
        setTheme(previousThemeRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── typewriter ────────────────────────────────────────────────────────────
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(FULL_TEXT.slice(0, i))
      if (i >= FULL_TEXT.length) { clearInterval(id); setCursorPhase('blinking') }
    }, 65)
    return () => clearInterval(id)
  }, [])

  // ── blink 4× then burst ───────────────────────────────────────────────────
  useEffect(() => {
    if (cursorPhase !== 'blinking') return
    if (cursorRef.current) {
      const r = cursorRef.current.getBoundingClientRect()
      setBurstOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    let ticks = 0
    const id = setInterval(() => {
      ticks++
      setBlinkOn(v => !v)
      if (ticks >= 8) { clearInterval(id); setCursorPhase('burst') }
    }, 260)
    return () => clearInterval(id)
  }, [cursorPhase])

  // ── canvas burst ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (cursorPhase !== 'burst' || !burstOrigin) return
    const cvs  = burstCanvasRef.current
    cvs.width  = window.innerWidth
    cvs.height = window.innerHeight
    const ctx  = cvs.getContext('2d')

    const particles = Array.from({ length: 340 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.3 + Math.random() * 1.8
      return {
        x: burstOrigin.x, y: burstOrigin.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, decay: 0.002 + Math.random() * 0.003,
        r: 0.4 + Math.random() * 0.8,
        color: GCOLORS[Math.floor(Math.random() * 4)],
      }
    })

    let raf
    const animate = () => {
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      let alive = false
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.99; p.vy *= 0.99
        p.life -= p.decay
        if (p.life <= 0) continue
        alive = true
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.globalAlpha = p.life
        ctx.fillStyle   = p.color
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (alive) raf = requestAnimationFrame(animate)
      else { ctx.clearRect(0, 0, cvs.width, cvs.height); setCursorPhase('done') }
    }
    animate()
    return () => cancelAnimationFrame(raf)
  }, [cursorPhase, burstOrigin])

  useEffect(() => {
    if (cursorPhase !== 'burst') return
    const t = setTimeout(() => setTypingDone(true), 200)
    return () => clearTimeout(t)
  }, [cursorPhase])

  // ── lenis smooth scroll ───────────────────────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })
    lenisRef.current = lenis
    function raf(time) { lenis.raf(time); rafRef.current = requestAnimationFrame(raf) }
    rafRef.current = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(rafRef.current); lenis.destroy() }
  }, [])


  // ── typewriter cursor ─────────────────────────────────────────────────────
  const hasNewline  = displayed.includes('\n')
  const line1Typed  = hasNewline ? LINE1 : displayed
  const line2Typed  = hasNewline ? displayed.slice(LINE1.length + 1) : ''
  const showCursor  = cursorPhase === 'typing' || (cursorPhase === 'blinking' && blinkOn)
  const cursor = showCursor ? (
    <span ref={cursorRef} style={{
      display: 'inline-block', width: isMobile ? '3px' : '6px', height: '0.88em',
      background: 'linear-gradient(180deg, #888 0%, #222 20%, #000 50%, #1a1a1a 80%, #555 100%)',
      boxShadow: '0 0 3px rgba(255,255,255,0.18)',
      marginLeft: '4px', verticalAlign: 'middle', borderRadius: '1px',
    }} />
  ) : null

  return (
    <div ref={containerRef} className="relative min-h-screen font-body text-[#111111] overflow-x-clip selection:bg-primary-container selection:text-on-primary-container">

      {/* ── scroll-driven background (framer-motion) ── */}
      <style>{`
        .btn-cta-liquid {
          position: relative;
          overflow: hidden;
          border-radius: 9999px;
          background: #000000;
          animation: none;
          box-shadow:
            0 0 18px rgba(255,255,255,0.22),
            0 0 55px rgba(255,255,255,0.10),
            0 0 100px rgba(255,255,255,0.05),
            0 6px 30px rgba(0,0,0,0.7),
            inset 0 1.5px 0 rgba(255,255,255,0.55),
            inset 0 -1px 0 rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.35);
        }
        .btn-cta-liquid::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -80%;
          width: 55%;
          height: 200%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0)    15%,
            rgba(255,255,255,0.55) 50%,
            rgba(255,255,255,0)    85%,
            transparent 100%
          );
          transform: skewX(-12deg);
          animation: cta-sheen 6s ease-in-out 0.5s infinite;
          pointer-events: none;
        }
        @keyframes cta-sheen {
          0%        { left: -80%;  }
          52%, 100% { left:  140%; }
        }
        .btn-get-started {
          transition: box-shadow 0.4s ease, transform 0.15s ease;
        }
        .btn-get-started:hover {
          box-shadow:
            0 0 18px rgba(255,255,255,0.25),
            0 0 40px rgba(255,255,255,0.12),
            0 4px 20px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.28),
            inset 0 -1px 0 rgba(0,0,0,0.4);
        }
      `}</style>

      <div style={{ backgroundColor: '#ffffff', position: 'fixed', inset: 0, zIndex: -2 }} />

      <HeroCanvas />

      {/* burst canvas */}
      <canvas ref={burstCanvasRef} style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        zIndex: 9999, pointerEvents: 'none',
        display: cursorPhase === 'burst' ? 'block' : 'none',
      }} />

      {/* ── navbar ── */}
      <motion.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-sm border-b border-[#111111]/5"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-3 sm:gap-8">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
            <img src={logo} alt="Placify AI" className="h-6 w-auto" />
            <span className="text-sm font-bold text-[#111111] tracking-tight hidden sm:inline">Placify AI</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <Link to="/login"    className="text-[13px] text-[#111111]/60 hover:text-[#111111] transition-colors duration-150 no-underline">Sign In</Link>
            <div className="btn-get-started relative overflow-hidden rounded-full" style={{
                background: 'linear-gradient(145deg, #0d0d0d 0%, #2c2c2c 25%, #1a1a1a 50%, #383838 75%, #0f0f0f 100%)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}>
              {/* top specular band */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 45%, transparent 65%)', pointerEvents: 'none' }} />
              {/* side edge glints */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 25%, transparent 75%, rgba(255,255,255,0.05) 100%)', pointerEvents: 'none' }} />
              <Link to="/register" className="relative flex items-center gap-1.5 text-white text-[13px] font-semibold px-4 sm:px-5 py-2 no-underline" style={{ zIndex: 1 }}>
                Get Started <span className="text-base leading-none">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      <main className="relative pb-20 z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] opacity-20 pointer-events-none -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-container via-transparent to-transparent" />

        {/* ── hero ── */}
        <section className="min-h-screen relative flex items-center justify-center text-center px-6">

          {/* logo — absolutely above text center, never disturbs text centering */}
          <div
            className={`absolute left-0 right-0 flex justify-center transition-all duration-700 ease-out ${
              typingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
            style={{ bottom: 'calc(50% + clamp(1rem, 6vw, 5.5rem) * 1.1 + 28px)' }}
          >
            <div className="flex items-center gap-4">
              <img src={logo} alt="Placify AI" className="h-14 w-auto" />
              <span className="text-3xl font-bold text-[#111111] tracking-tight">Placify AI</span>
            </div>
          </div>

          {/* typewriter — only element in flex flow, sits exactly at 50vh center */}
          <div style={{ fontFamily: '"Funnel Sans", sans-serif', fontSize: 'clamp(1rem, 6vw, 5.5rem)', fontWeight: isMobile ? 500 : 200, lineHeight: 1.1, letterSpacing: '-0.035em', color: '#111111', textAlign: 'center' }}>
            <div>
              <div style={{ display: 'inline-block', position: 'relative' }}>
                <span style={{ visibility: 'hidden', whiteSpace: 'nowrap' }}>{LINE1}</span>
                <span style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap' }}>
                  {line1Typed}{cursorPhase !== 'burst' && cursorPhase !== 'done' && !hasNewline && cursor}
                </span>
              </div>
            </div>
            <div>
              <div style={{ display: 'inline-block', position: 'relative' }}>
                <span style={{ visibility: 'hidden', whiteSpace: 'nowrap' }}>{LINE2}</span>
                <span style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap' }}>
                  {line2Typed}{cursorPhase !== 'burst' && cursorPhase !== 'done' && hasNewline && cursor}
                </span>
              </div>
            </div>
          </div>

        </section>

        <section className="py-20 px-4 sm:px-6 md:px-12">
          <div className="max-w-6xl mx-auto">

            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP}
              transition={{ duration: 0.5 }} className="text-center mb-10">
              <p className="text-xs font-bold uppercase tracking-widest text-black/30 mb-2">Our Process</p>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-[#111]">How it works</h2>
            </motion.div>

            <LayoutGroup>
              <motion.div
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex flex-col md:flex-row gap-3"
              >
                {CARD_GROUPS.map(group => {
                  const isActive    = activeCard === group.id
                  const otherActive = activeCard !== null && !isActive

                  // sizes — mobile: height-based stack, desktop: flex 80:20
                  const mobileHeight = isActive ? 480 : otherActive ? 120 : 290

                  // internal card dimensions – square (1:1)
                  const cardW = isMobile ? 128 : 178
                  const cardH = cardW

                  return (
                    <motion.div
                      key={group.id}
                      layout
                      onClick={() => !isMobile && setActiveCard(isActive ? null : group.id)}
                      className={`relative overflow-hidden rounded-3xl ${isMobile ? '' : 'cursor-pointer'}`}
                      style={isMobile
                        ? { width: '100%', height: mobileHeight }
                        : {
                            flexGrow: isActive ? 4 : 1,
                            flexShrink: 1,
                            flexBasis: 0,
                            minWidth: 0,
                            height: 480,
                          }
                      }
                      animate="idle"
                      whileHover={!isActive && !isMobile ? 'hovered' : 'idle'}
                      transition={{
                        layout: { type: 'spring', stiffness: 200, damping: 34, mass: 1.2 },
                      }}
                    >
                      {/* bg image — full image shown (no crop), zooms on hover */}
                      <motion.img
                        src={group.image}
                        alt={group.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        variants={{ idle: { scale: 1 }, hovered: { scale: 1.06 } }}
                        transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />

                      {/* overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

                      {/* tag + arrow */}
                      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                        <motion.div
                          className="flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/15 rounded-full px-4 py-2"
                          layout
                        >
                          <span className="text-[12px] font-bold text-white whitespace-nowrap">{group.tag}</span>
                        </motion.div>
                        <motion.button
                          layout
                          onClick={e => { e.stopPropagation(); !isMobile && setActiveCard(isActive ? null : group.id) }}
                          className={`w-9 h-9 rounded-full bg-black/25 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/40 text-sm font-bold ${isMobile ? 'hidden' : ''}`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                        >
                          <motion.span
                            key={isActive ? 'close' : 'open'}
                            initial={{ rotate: -60, opacity: 0 }}
                            animate={{ rotate: 0,   opacity: 1 }}
                            exit={{ rotate: 60,    opacity: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            {isActive ? '←' : '→'}
                          </motion.span>
                        </motion.button>
                      </div>

                      {/* internal image cards — bottom-right when expanded */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            className="absolute z-10 flex gap-3"
                            style={{ bottom: isMobile ? 72 : 88, right: isMobile ? 12 : 20 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            {group.steps.map((step, i) => (
                              <motion.div
                                key={step.label}
                                className="relative overflow-hidden rounded-2xl flex-shrink-0"
                                style={{ width: cardW, height: cardH, background: '#96a09d' }}
                                initial={{ opacity: 0, y: 32, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0,  scale: 1 }}
                                exit={{ opacity: 0, y: 24, scale: 0.92 }}
                                transition={{
                                  type: 'spring', stiffness: 300, damping: 28,
                                  delay: i * 0.1 + 0.22,
                                }}
                              >
                                <img src={step.img} alt={step.title}
                                  className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md border border-white/15 rounded-full px-2.5 py-0.5 flex items-center">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-white leading-none">{step.label}</span>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-8">
                                  <div className="text-[9px] font-bold text-white leading-tight mb-0.5">{step.title}</div>
                                  <p className="text-[7px] text-white/60 leading-snug">{step.desc}</p>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* bottom text */}
                      <div className="absolute bottom-5 left-5 right-5 z-10">
                        <motion.h3
                          className="font-headline font-extrabold text-white leading-tight tracking-tight mb-1"
                          animate={{ fontSize: isActive ? (isMobile ? '1.25rem' : '1.5rem') : '1.2rem' }}
                          transition={{ type: 'spring', stiffness: 200, damping: 30, delay: 0.05 }}
                        >
                          {group.title}
                        </motion.h3>
                        <AnimatePresence>
                          {isActive && (
                            <motion.p
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              transition={{ duration: 0.3, delay: 0.18 }}
                              className="text-[13px] text-white/70 leading-relaxed"
                            >
                              {group.desc}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </LayoutGroup>

          </div>
        </section>

        {/* ── features ── */}
        <section id="features" className="container mx-auto px-4 sm:px-6 space-y-20 md:space-y-32 pt-24">

          {/* feature 1 */}
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-20">
            <motion.div
              variants={fadeLeft} initial="hidden" whileInView="visible" viewport={VP}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex-1 space-y-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#111111]/8 border border-[#111111]/15 flex items-center justify-center text-[#111111]">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </div>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-[#111111] leading-tight">Peer Benchmarking</h2>
              <p className="text-[#111111]/70 text-lg leading-relaxed font-body">Understand your position among other students — not in isolation.</p>
              <ul className="space-y-3 list-disc list-inside">
                {[
                  'Percentile ranking across profiles',
                  'Confidence score for prediction reliability',
                  'Tier probability distribution (Startup, Product, Service, etc.)',
                ].map((text) => (
                  <li key={text} className="text-sm font-headline font-bold uppercase tracking-wider text-[#111111] marker:text-xl">
                    {text}
                  </li>
                ))}
              </ul>
              <p className="text-[#111111]/50 text-sm font-body italic">Know if you're ahead, average, or behind — with data.</p>
            </motion.div>
            <motion.div
              variants={fadeRight} initial="hidden" whileInView="visible" viewport={VP}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
              className="flex-1 relative"
            >
              <div className="bg-white/40 backdrop-blur-2xl border border-outline-variant/15 aspect-square rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.08)] group">
                <div className="w-64 h-64 bg-gradient-to-br from-primary-container to-secondary-container rounded-full blur-[80px] opacity-30 absolute animate-pulse z-10 pointer-events-none" />
                <img
                  src={featureimage1}
                  alt="Behavioral analysis"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/30 via-transparent to-transparent" />
              </div>
            </motion.div>
          </div>

          {/* feature 2 */}
          <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-20">
            <motion.div
              variants={fadeLeft} initial="hidden" whileInView="visible" viewport={VP}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
              className="flex-1 relative"
            >
              <div className="bg-white/40 backdrop-blur-2xl border border-outline-variant/15 aspect-square rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.08)] group">
                <div className="w-80 h-80 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-full blur-[100px] opacity-40 absolute z-10 pointer-events-none" />
                <img
                  src={featureimage2}
                  alt="Salary analytics dashboard"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/30 via-transparent to-transparent" />
              </div>
            </motion.div>
            <motion.div
              variants={fadeRight} initial="hidden" whileInView="visible" viewport={VP}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex-1 space-y-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-[#111111] leading-tight">Predictive Package Calibration</h2>
              <p className="text-[#111111]/70 text-lg leading-relaxed font-body">Don't settle for estimates. Our market-tuned algorithms compare real-time hiring data to predict your salary potential in the current fiscal year.</p>
              <div className="p-6 rounded-3xl bg-secondary-container/20 border border-secondary-container/15">
                <div className="text-xs font-headline font-black uppercase tracking-widest text-[#111111]/80 mb-1">Target Achievement</div>
                <div className="text-3xl font-headline font-black text-[#111111]">₹12.4 Lakhs <span className="text-sm font-medium text-[#111111]/50">/ per annum</span></div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CTA ── */}
        <motion.section
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={VP}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="container mx-auto px-6 mt-40"
        >
          <div className="bg-white/40 backdrop-blur-3xl border border-outline-variant/15 px-4 py-12 md:p-24 rounded-[2rem] md:rounded-[4rem] relative overflow-hidden text-center shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] -ml-48 -mb-48" />
            <div className="relative z-10 max-w-3xl mx-auto space-y-12">
              <h2 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tighter text-[#111111]">Ready for the Next Chapter?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">▶</div>
                    <span className="font-headline font-bold uppercase tracking-widest text-xs">ATS Resume Scoring</span>
                  </div>
                  <p className="text-[#111111]/70 font-body">Get a real ATS compatibility score on your resume — with specific feedback on what's hurting your chances and a strength rating recruiters actually care about.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">★</div>
                    <span className="font-headline font-bold uppercase tracking-widest text-xs">Verified Identity</span>
                  </div>
                  <p className="text-[#111111]/70 font-body">Your scores are cryptographically signed and verified, giving hiring managers immediate trust in your data.</p>
                </div>
              </div>
              <div className="pt-8 relative z-20 flex justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                  className="btn-cta-liquid"
                >
                  {/* glass specular */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.10) 30%, transparent 55%, rgba(255,255,255,0.04) 100%)', pointerEvents: 'none', borderRadius: 9999 }} />
                  <Link to="/analyze" className="relative inline-block text-center px-5 md:px-12 py-5 md:py-6 text-xs md:text-sm uppercase tracking-[0.18em] md:tracking-[0.2em] text-white font-headline font-bold no-underline pointer-events-auto whitespace-nowrap" style={{ zIndex: 1, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                    Start Your Placement Analysis
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* ── footer ── */}
      <footer className="bg-[#111111] text-on-surface-variant font-body tracking-tight text-sm z-20 relative">
        <div className="w-full py-16 px-6 md:px-12 flex flex-col md:flex-row justify-between items-start gap-12 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Placify AI" className="h-8 w-auto brightness-0 invert" />
              <span className="text-lg font-bold text-white tracking-tighter">Placify AI</span>
            </div>
            <p className="text-on-surface-variant max-w-xs leading-relaxed">Redefining career readiness through ethereal intelligence and editorial-grade data mapping.</p>
          </div>
          <div className="space-y-6 md:w-72">
            <h4 className="text-white font-medium uppercase text-xs tracking-widest">Subscribe</h4>
            <div className="relative">
              <input className="w-full bg-white/5 border-none rounded-full px-6 py-3 text-white/80 focus:ring-2 focus:ring-primary-container/50 outline-none placeholder:text-white/30" placeholder="Email address" type="email" />
              <button className="absolute right-2 top-2 px-3 py-1.5 text-primary-container hover:text-white font-bold">→</button>
            </div>
          </div>
        </div>
        <div className="w-full py-8 px-6 md:px-12 border-t border-white/10 text-center">
          <p>© 2026 Placify AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

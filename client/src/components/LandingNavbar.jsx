import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Zap, Menu, X } from 'lucide-react'
import { cn } from '../lib/utils'
import logo from '../assets/logo.png'

export default function LandingNavbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleGetStarted = () => navigate(user ? '/analyze' : '/login')

  return (
    <header className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-400', scrolled ? 'py-0' : 'py-0')}>
      <div style={{
        background: scrolled ? 'rgba(242,253,255,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.05)' : 'none',
        transition: 'all 0.35s ease',
      }}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <img src={logo} alt="Placify AI" className="h-7 w-auto transition-all group-hover:scale-105" />
            <span className="font-display font-extrabold text-sm text-[#111111] tracking-tight">Placify AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {['Features', 'How It Works', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[rgba(0,0,0,0.45)] hover:text-[#111111] hover:bg-[rgba(0,0,0,0.05)] transition-all no-underline">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/login" className="no-underline">
              <button className="h-9 px-4 rounded-xl text-xs font-semibold text-[#111111] hover:bg-[rgba(0,0,0,0.05)] hover:text-[#111111] transition-all cursor-pointer">
                Sign In
              </button>
            </Link>
            <button onClick={handleGetStarted}
              className="h-9 px-5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ background: '#111111', color: 'white', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
              Get Started
            </button>
          </div>

          <button className="md:hidden p-2 rounded-xl text-[#111111] hover:bg-[rgba(0,0,0,0.05)] transition-all cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden px-5 py-4 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            {['Features', 'How It Works', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-[rgba(0,0,0,0.50)] hover:text-[#111111] no-underline transition-colors">{item}</a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="flex-1 no-underline">
                <button className="w-full h-9 rounded-xl border border-[rgba(0,0,0,0.10)] text-[#111111] text-xs font-bold cursor-pointer hover:bg-[rgba(0,0,0,0.05)] transition-all">Sign In</button>
              </Link>
              <button onClick={handleGetStarted} className="flex-1 h-9 rounded-xl text-xs font-bold cursor-pointer text-white transition-all hover:-translate-y-0.5" style={{ background: '#111111' }}>
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

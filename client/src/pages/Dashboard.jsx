import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../utils/api'
import logo from '../assets/logo.png'
import LandingFooter from '../components/LandingFooter'
import { FloatingPathsBackground } from '../components/ui/background-paths'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analysis/history')
      .then(res => { setAnalyses(res.data.analyses); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const latest = analyses[0] || null
  const statValues = {
    count: analyses.length,
    strength: latest?.resume_strength || '—',
    confidence: latest?.overall_confidence ? `${latest.overall_confidence}` : '—',
    ctc: latest?.salary_expected ? `${latest.salary_expected}` : '—',
  }

  const icons = ['robot_2', 'architecture', 'psychology', 'strategy']
  const bgColors = ['bg-primary-container/20 dark:bg-amber-900/20', 'bg-secondary-container/20 dark:bg-stone-700/20', 'bg-primary-container/20 dark:bg-amber-900/20', 'bg-secondary-container/20 dark:bg-stone-700/20']
  const textColors = ['text-primary dark:text-amber-400', 'text-secondary dark:text-stone-400', 'text-primary dark:text-amber-400', 'text-secondary dark:text-stone-400']

  return (
    <div
      className="bg-background dark:bg-[#141210] text-on-surface dark:text-stone-100 font-body min-h-screen selection:bg-primary-container selection:text-on-primary-container relative"
      style={{ isolation: 'isolate' }}
    >
      {/* Fixed background paths — z:0 paints after bg-background but under z-10 content */}
      <FloatingPathsBackground style={{ color: '#C48502' }} className="opacity-100" />

      <main className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto relative z-10">
        {/* Welcome Header */}
        <header className="mb-8 md:mb-16 text-center md:text-left">
          <h1 className="font-headline text-3xl sm:text-4xl md:text-7xl font-extrabold tracking-tighter text-on-surface dark:text-stone-100 mb-2 responsive-text">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-on-surface-variant dark:text-stone-400 text-sm md:text-lg max-w-2xl mx-auto md:mx-0">
            Your career trajectory is currently outperforming 84% of your peer group. Ready for your next move?
          </p>
        </header>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-16">
          {/* Growth Card */}
          <div className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white/80 dark:bg-stone-900/80 text-[#111111] dark:text-stone-100 flex flex-col justify-between items-center md:items-stretch text-center md:text-left min-h-[140px] shadow-blue">
            <div>
              <span className="material-symbols-outlined mb-4 text-[#111111] dark:text-stone-300" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              <h3 className="font-label text-sm uppercase tracking-widest opacity-70">Total Scans</h3>
            </div>
            <div className="mt-auto">
              <span className="font-headline text-3xl md:text-5xl font-black">{statValues.count}</span>
              <p className="text-xs opacity-60 mt-1">career analyses</p>
            </div>
          </div>
          {/* Score Card */}
          <div className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-primary-container/70 dark:bg-amber-900/25 text-on-primary-container dark:text-stone-100 flex flex-col justify-between items-center md:items-stretch text-center md:text-left min-h-[140px] shadow-blue">
            <div>
              <span className="material-symbols-outlined mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              <h3 className="font-label text-sm uppercase tracking-widest opacity-80">Skill Score</h3>
            </div>
            <div className="mt-auto">
              <span className="font-headline text-3xl md:text-5xl font-black">{statValues.strength}</span>
              <p className="text-xs opacity-70 mt-1">resume strength /100</p>
            </div>
          </div>
          {/* Market Card */}
          <div className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-secondary-container/70 dark:bg-stone-800/70 text-on-secondary-container dark:text-stone-100 flex flex-col justify-between items-center md:items-stretch text-center md:text-left min-h-[140px] shadow-card-md">
            <div>
              <span className="material-symbols-outlined mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
              <h3 className="font-label text-sm uppercase tracking-widest opacity-80">Confidence</h3>
            </div>
            <div className="mt-auto">
              <span className="font-headline text-3xl md:text-5xl font-black">{statValues.confidence}{statValues.confidence !== '—' ? '%' : ''}</span>
              <p className="text-xs opacity-70 mt-1">market fit metric</p>
            </div>
          </div>
          {/* Expected CTC */}
          <div className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white/70 dark:bg-stone-900/70 flex flex-col justify-between items-center md:items-stretch text-center md:text-left min-h-[140px] shadow-card-md">
            <div>
              <span className="material-symbols-outlined mb-4 text-primary dark:text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
              <h3 className="font-label text-sm uppercase tracking-widest text-on-surface-variant dark:text-stone-400">Expected CTC</h3>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-1">
                <span className="font-label text-xl font-medium text-primary dark:text-amber-400">₹</span>
                <span className="font-headline text-2xl md:text-4xl font-black text-on-surface dark:text-stone-100">{statValues.ctc}{statValues.ctc !== '—' ? 'L' : ''}</span>
              </div>
              <p className="text-xs text-on-surface-variant dark:text-stone-400 mt-1">Market standard max</p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="mb-10 md:mb-20">
          <div className="bg-[#111111]/90 dark:bg-stone-800 rounded-[2.5rem] overflow-hidden relative p-6 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_30px_60px_rgba(0,0,0,0.20)]">
            <div style={{ position: 'absolute', top: -40, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div className="relative z-10 text-center md:text-left">
              <h2 className="font-headline text-3xl md:text-5xl font-bold text-white tracking-tighter mb-4">Ready for a new career sprint?</h2>
              <p className="text-white/50 text-lg">Run our latest neural analysis to find your next jump.</p>
            </div>
            <div className="relative z-10 shrink-0">
              <Link to="/analyze" style={{ transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }} className="inline-block bg-primary-container text-on-primary-container px-5 py-3 md:px-8 md:py-5 rounded-full font-headline font-bold text-lg hover:scale-105 active:scale-95 shadow-blue-sm">
                Start New Analysis
              </Link>
            </div>
          </div>
        </section>

        {/* Analysis History Grid */}
        <section>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left mb-6 md:mb-10">
            <h2 className="font-headline text-xl md:text-3xl font-extrabold tracking-tighter">Analysis History</h2>
            <Link to="/analyze" className="text-primary dark:text-amber-400 font-bold font-label flex items-center gap-2 hover:translate-x-1 transition-transform">
              New Scan <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-10 md:py-20 text-on-surface-variant font-bold font-headline animate-pulse">
              Syncing Neural History...
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-10 md:py-20 bg-white/40 dark:bg-stone-900/40 glass-card rounded-[1.5rem] md:rounded-[2rem]">
              <h3 className="font-headline text-2xl font-bold mb-4">No analysis history yet</h3>
              <p className="text-on-surface-variant dark:text-stone-400 mb-8">Begin your journey by uploading your resume.</p>
              <Link to="/analyze" className="bg-[#111111] dark:bg-stone-700 text-white px-8 py-4 rounded-full font-headline font-bold hover:scale-105 transition-all">Start Now</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {analyses.map((analysis, i) => (
                <div key={analysis.id} onClick={() => navigate(`/results/${analysis.id}`)} style={{ transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }} className="p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] hover:shadow-blue group cursor-pointer bg-white/90 dark:bg-stone-900/90">
                  <div className="flex justify-between items-start mb-4 md:mb-10">
                    <div className={`${bgColors[i % 4]} p-4 rounded-2xl`}>
                      <span className={`material-symbols-outlined ${textColors[i % 4]} scale-125`}>{icons[i % 4]}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-headline text-2xl md:text-4xl font-black text-on-surface dark:text-stone-100">{analysis.overall_confidence || 85}%</span>
                      <p className={`font-label text-xs uppercase tracking-widest ${textColors[i % 4]} font-bold`}>Match Score</p>
                    </div>
                  </div>
                  <h3 className="font-headline text-lg md:text-2xl font-bold mb-2 break-words line-clamp-2">{analysis.predicted_role}</h3>
                  <p className="text-on-surface-variant dark:text-stone-400 mb-10 font-medium">{analysis.predicted_tier} Tier Target</p>
                  <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10 dark:border-stone-700/30">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-on-surface-variant dark:text-stone-400 font-bold mb-1">Estimated Comp</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold">₹</span>
                        <span className="text-xl font-bold hover:text-primary dark:hover:text-amber-400 transition-colors">{analysis.salary_expected}L</span>
                      </div>
                    </div>
                    <button className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-outline-variant/20 dark:border-stone-600/40 flex items-center justify-center group-hover:bg-on-surface dark:group-hover:bg-stone-200 group-hover:text-white dark:group-hover:text-stone-900 transition-all duration-300">
                      <span className="material-symbols-outlined">north_east</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <LandingFooter />

      {false && (
      <footer className="w-full py-16 px-12 grid grid-cols-1 md:grid-cols-4 gap-12 text-on-surface-variant relative z-10 bg-white/40 border-t border-outline-variant/10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            <img src={logo} alt="Placify AI" className="h-8 w-auto" />
            <span className="text-lg font-bold text-[#111111] font-headline">Placify AI</span>
          </div>
          <p className="mt-4 font-body tracking-tight text-sm leading-relaxed text-on-surface-variant">
            Empowering career leaps through neural market intelligence and precision matchmaking.
          </p>
        </div>
        <div>
          <h4 className="text-[#111111] font-bold mb-4 uppercase text-xs tracking-widest">Product</h4>
          <ul className="space-y-2 font-body text-sm font-medium">
            <li><Link className="hover:text-primary transition-colors duration-200" to="#">Features</Link></li>
            <li><Link className="hover:text-primary transition-colors duration-200" to="#">API</Link></li>
            <li><Link className="hover:text-primary transition-colors duration-200" to="#">Support</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[#111111] font-bold mb-4 uppercase text-xs tracking-widest">Legal</h4>
          <ul className="space-y-2 font-body text-sm font-medium">
            <li><Link className="hover:text-primary transition-colors duration-200" to="#">Privacy</Link></li>
            <li><Link className="hover:text-primary transition-colors duration-200" to="#">Terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-body tracking-tight text-sm font-medium text-on-surface-variant">© 2026 Placify AI. All rights reserved. Prices in ₹.</p>
          <div className="mt-6 flex gap-4">
            <span className="material-symbols-outlined cursor-pointer hover:text-primary text-[#111111] transition-colors">language</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-primary text-[#111111] transition-colors">share</span>
          </div>
        </div>
      </footer>
      )}
    </div>
  )
}

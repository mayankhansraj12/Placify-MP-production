import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'
import api from '../utils/api'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { generateReport } from '../utils/pdfReport'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import MarkdownText from '../components/MarkdownText'

const BAR_COLORS = ['#C48502', '#D4B896', '#A67C52', '#7B5E42', '#B89860']

const splitListValue = (value, separators = /,|→|â†’/) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string') return []
  return value
    .split(separators)
    .map(item => item.trim())
    .filter(Boolean)
}

const splitLinesValue = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string') return []
  return value
    .split(/\r?\n|;|\|/)
    .map(item => item.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
}

const getCompanyName = (company) => {
  if (typeof company === 'string') return company
  return company?.name || company?.company || 'Unknown'
}

const getCompanyCards = (results) => {
  if (Array.isArray(results.company_details) && results.company_details.length > 0) {
    return results.company_details
  }
  return splitListValue(results.target_companies).map(name => ({ name }))
}

const getFeedbackText = (item) => {
  if (typeof item === 'string') return item
  return item?.message || item?.text || ''
}

const getQuestionCards = (value) => {
  if (Array.isArray(value)) {
    return value.map(item => (
      typeof item === 'string' ? { question: item } : item
    )).filter(item => item?.question)
  }
  return splitLinesValue(value).map(question => ({ question }))
}

const formatMarkdownList = (value) => {
  const repairMarkdown = (text) => text.replace(
    /(^|\n)(-\s+)?((?:Week|Day|Days)\s+\d[^:\n]{0,80}):\*\*/g,
    '$1$2**$3:**'
  )

  if (Array.isArray(value)) {
    const markdown = value
      .filter(Boolean)
      .map(item => {
        const text = repairMarkdown(String(item).trim())
        return /^[-*]\s+/.test(text) ? text : `- ${text}`
      })
      .join('\n')
    return repairMarkdown(markdown)
  }
  return typeof value === 'string' ? repairMarkdown(value.trim()) : ''
}

export default function Results() {
  useDocumentTitle('Results')
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const { theme } = useTheme()

  const [data, setData] = useState(location.state?.analysis || null)
  const [loading, setLoading] = useState(!data)

  // Build theme-aware color map (must be before any early returns)
  const D = theme === 'dark'
  const tc = D ? '240,235,228' : '28,25,23'
  const ra = (a) => `rgba(${tc},${a})`
  const c = {
    bg: D ? '#141210' : '#FAFAF7',
    card: D ? '#1d1a15' : '#ffffff',
    text: D ? '#f0ebe4' : '#1C1917',
    t65: ra(0.65), t58: ra(0.58), t55: ra(0.55),
    t50: ra(0.50), t45: ra(0.45), t42: ra(0.42),
    t40: ra(0.40), t38: ra(0.38), t36: ra(0.36),
    t35: ra(0.35), t32: ra(0.32), t30: ra(0.30),
    t28: ra(0.28), t25: ra(0.25), t20: ra(0.20),
    t18: ra(0.18), t12: ra(0.12), t10: ra(0.10),
    t09: ra(0.09), t08: ra(0.08), t07: ra(0.07),
    t06: ra(0.06), t05: ra(0.05), t04: ra(0.04),
  }

  useEffect(() => {
    if (data) return
    api.get(`/analysis/${id}`)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [data, id])

  if (loading) {
    return (
      <div className="font-body min-h-screen flex items-center justify-center" style={{ background: c.bg }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(196,133,2,0.25)', borderTopColor: '#C48502' }} />
          <p className="font-bold font-headline animate-pulse" style={{ color: c.text }}>Synchronizing Neural Analysis...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="font-body min-h-screen flex items-center justify-center p-6" style={{ background: c.bg }}>
        <div className="max-w-sm w-full p-10 text-center rounded-[2rem]" style={{ background: c.card, border: `1px solid ${c.t10}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <span className="material-symbols-outlined text-6xl mb-4 block" style={{ color: c.t20 }}>error</span>
          <h3 className="font-headline text-2xl font-extrabold mb-2" style={{ color: c.text }}>Analysis not found</h3>
          <p className="text-sm mb-8" style={{ color: c.t55 }}>We couldn't find the requested analysis report.</p>
          <Link to="/dashboard" className="inline-block px-8 py-3 rounded-full font-headline font-bold hover:opacity-80 transition-all" style={{ background: c.text, color: c.bg }}>Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const results = data.results
  const handleDownload = () => generateReport(results, user?.name)

  const radarData = results.domain_scores
    ? Object.entries(results.domain_scores).map(([name, value]) => ({ subject: name, score: value, fullMark: 100 }))
    : []

  const tierData = results.tier_distribution
    ? Object.entries(results.tier_distribution).map(([name, value]) => ({ name, probability: value }))
    : []

  const atsScore = results.ats_score || 0
  const atsLabel = atsScore >= 75 ? 'ATS Optimized' : atsScore >= 50 ? 'Needs Improvement' : 'Needs Significant Work'
  const companyCards = getCompanyCards(results)
  const skillGaps = Array.isArray(results.skill_gaps) ? results.skill_gaps : []
  const quickActions = splitLinesValue(results.quick_actions)
  const interviewTips = splitLinesValue(results.interview_tips)
  const interviewQuestions = getQuestionCards(results.interview_questions)
  const topRoles = Array.isArray(results.top_roles) ? results.top_roles : []
  const atsFeedbackEnhanced = Array.isArray(results.ats_feedback_enhanced) ? results.ats_feedback_enhanced : []
  const atsFeedback = splitLinesValue(results.ats_feedback)

  return (
    <div className="font-body overflow-x-hidden" style={{ minHeight: '100vh', background: c.bg }}>
      {/* Fixed background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: D
        ? `radial-gradient(ellipse 60% 50% at 100% 0%, rgba(196,133,2,0.10) 0%, transparent 65%), radial-gradient(ellipse 40% 35% at 0% 100%, rgba(166,124,82,0.04) 0%, transparent 60%), #141210`
        : `radial-gradient(ellipse 60% 50% at 100% 0%, rgba(196,133,2,0.14) 0%, transparent 65%), radial-gradient(ellipse 40% 35% at 0% 100%, rgba(166,124,82,0.06) 0%, transparent 60%), #FAFAF7`
      }} />

      <style>{`
        .sc-card { transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease; }
        .sc-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px ${c.t09}, 0 4px 12px ${c.t05}; }
        .float-card { transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease; }
        .float-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px ${c.t08}, 0 4px 12px rgba(196,133,2,0.08); }
      `}</style>

      <main className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto space-y-8 md:space-y-16 relative z-10">

        {/* ── Hero ── */}
        <section>
          <div className="rounded-[1.5rem] md:rounded-[2.5rem] p-5 sm:p-6 md:p-16 overflow-hidden relative flex flex-col md:flex-row items-center gap-8 md:gap-12"
            style={{ background: c.card, border: '1px solid rgba(196,133,2,0.18)', boxShadow: '0 4px 32px rgba(196,133,2,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'rgba(196,133,2,0.09)', filter: 'blur(80px)', pointerEvents: 'none' }} />

            <div className="flex-1 min-w-0 space-y-6 relative z-10 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase" style={{ background: c.t05, border: `1px solid ${c.t10}`, color: c.t50 }}>
                Analysis Complete
              </div>
              <h1 className="font-headline text-3xl sm:text-4xl md:text-7xl font-black tracking-tighter leading-tight responsive-text" style={{ color: c.text }}>
                {results.predicted_role}
              </h1>
              <div className="flex flex-wrap gap-8 md:gap-12 justify-center md:justify-start">
                <div className="space-y-1">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: c.t40 }}>Predicted Tier</p>
                  <p className="text-2xl font-headline font-bold tracking-tight" style={{ color: c.text }}>{results.predicted_tier}</p>
                  {results.tier_confidence != null && (
                    <p className="text-xs font-semibold" style={{ color: c.t40 }}>{results.tier_confidence}% tier confidence</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: c.t40 }}>Expected Package</p>
                  <p className="text-2xl font-headline font-bold tracking-tight" style={{ color: c.text }}>₹{results.salary_range?.expected} LPA</p>
                  {results.salary_range?.low != null && results.salary_range?.high != null && (
                    <p className="text-xs font-semibold" style={{ color: c.t40 }}>Range: ₹{results.salary_range.low}L – ₹{results.salary_range.high}L</p>
                  )}
                </div>
              </div>
              <button onClick={handleDownload} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase hover:opacity-75 transition-all" style={{ background: c.text, color: c.bg }}>
                <span className="material-symbols-outlined text-sm">download</span> Download PDF Report
              </button>
            </div>

            {/* Confidence Dial */}
            <div className="relative w-44 h-44 md:w-64 md:h-64 flex items-center justify-center z-10 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
                <circle cx="128" cy="128" fill="transparent" r="110" stroke={c.t07} strokeWidth="12" />
                <circle cx="128" cy="128" fill="transparent" r="110" stroke="url(#dialGradient)" strokeDasharray="691" strokeDashoffset={691 - (691 * (results.overall_confidence || 0)) / 100} strokeLinecap="round" strokeWidth="16" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                <defs>
                  <linearGradient id="dialGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#D4B896" />
                    <stop offset="50%" stopColor="#C48502" />
                    <stop offset="100%" stopColor="#A67C52" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl md:text-5xl font-black tracking-tighter" style={{ color: c.text }}>{results.overall_confidence}%</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: c.t40 }}>Confidence</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Narrative ── */}
        {results.ai_narrative && (
          <section className="rounded-[2rem] p-6 md:p-8" style={{ background: c.card, border: `1px solid ${c.t08}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-amber-500">auto_awesome</span>
              <h3 className="font-headline text-xl font-bold" style={{ color: c.text }}>AI Career Summary</h3>
            </div>
            <MarkdownText className="text-sm md:text-base leading-relaxed font-medium" style={{ color: c.t65 }}>
              {results.ai_narrative}
            </MarkdownText>
          </section>
        )}

        {/* ── Scorecard ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Resume Strength',    value: results.resume_strength,    suffix: '%',  icon: 'description', accent: '#C48502' },
            { label: 'Industry Readiness', value: results.industry_readiness, suffix: '%',  icon: 'factory',     accent: '#8C6A3F' },
            { label: 'Peer Percentile',    value: results.peer_percentile,    suffix: 'th', icon: 'leaderboard', accent: '#5E4730' },
            { label: 'FAANG Probability',  value: results.faang_probability,  suffix: '%',  icon: 'stars',       accent: '#3D2E20' },
          ].map(({ label, value, suffix, icon, accent }) => value != null && (
            <div key={label} className="sc-card rounded-[1.5rem] overflow-hidden" style={{
              background: c.card,
              border: `1px solid ${c.t09}`,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}>
              <div style={{ height: '3px', background: `linear-gradient(90deg, ${accent} 0%, ${accent}40 100%)` }} />
              <div className="p-4 md:p-6 flex flex-col gap-4">
                <div style={{ background: `${accent}12`, width: 40, height: 40 }} className="rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl" style={{ color: accent }}>{icon}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.t42 }}>{label}</p>
                  <p className="text-2xl md:text-3xl font-black font-headline tracking-tighter" style={{ color: c.text }}>
                    {value}<span className="text-base font-semibold ml-0.5" style={{ color: c.t40 }}>{suffix}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ── Charts ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div className="float-card rounded-[1.5rem] md:rounded-[2rem] p-5 sm:p-6 md:p-8 min-h-[320px] md:min-h-[400px] flex flex-col justify-between" style={{ background: c.card, border: `1px solid ${c.t08}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: c.t40 }}>Skill Competency</h3>
              <p className="font-headline text-2xl font-bold tracking-tight" style={{ color: c.text }}>Capability Spectrum</p>
            </div>
            <div className="flex items-center justify-center py-4 h-[300px]">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke={c.t08} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: c.text, fontSize: 13, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="score" stroke="#C48502" fill="#C48502" fillOpacity={0.14} strokeWidth={2.5} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm font-bold" style={{ color: c.t35 }}>Not enough data</p>
              )}
            </div>
          </div>

          <div className="float-card rounded-[1.5rem] md:rounded-[2rem] p-5 sm:p-6 md:p-8 min-h-[320px] md:min-h-[400px] flex flex-col justify-between" style={{ background: c.card, border: `1px solid ${c.t08}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: c.t40 }}>Benchmarking</h3>
              <p className="font-headline text-2xl font-bold tracking-tight" style={{ color: c.text }}>Tier Probability</p>
            </div>
            <div className="flex items-center justify-center py-4 h-[300px]">
              {tierData.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={tierData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={c.t06} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: c.t45, fontSize: 11, fontWeight: 600 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: c.text, fontSize: 12, fontWeight: 700 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: c.card, border: `1px solid ${c.t10}`, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                      labelStyle={{ color: c.text, fontWeight: 700, marginBottom: 4 }}
                      itemStyle={{ color: c.t65, fontWeight: 600 }}
                    />
                    <Bar dataKey="probability" radius={[0, 12, 12, 0]} barSize={24}>
                      {tierData.map((_, index) => (
                        <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm font-bold" style={{ color: c.t35 }}>Not enough data</p>
              )}
            </div>
          </div>
        </section>

        {/* ── ATS Report ── */}
        {results.ats_score != null && (
          <section className="float-card rounded-[1.5rem] md:rounded-[2rem] p-5 sm:p-6 md:p-10" style={{ background: c.card, border: `1px solid ${c.t08}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex flex-col md:flex-row gap-8 md:gap-12">

              {/* Score column */}
              <div className="shrink-0 flex flex-col items-center md:items-start gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: c.t38 }}>Resume Quality</p>
                  <h3 className="font-headline text-2xl font-bold tracking-tight" style={{ color: c.text }}>ATS Compatibility</h3>
                </div>
                <div className="relative w-28 h-28 mt-2">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="46" fill="none" stroke={c.t08} strokeWidth="9" />
                    <circle cx="56" cy="56" r="46" fill="none" stroke={c.text} strokeWidth="9" strokeLinecap="round"
                      strokeDasharray="289" strokeDashoffset={289 - (289 * atsScore) / 100}
                      style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black font-headline leading-none" style={{ color: c.text }}>{results.ats_score}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: c.t32 }}>/ 100</span>
                  </div>
                </div>
                <span className="text-xs font-semibold" style={{ color: c.t50 }}>{atsLabel}</span>
              </div>

              {/* Vertical divider */}
              <div className="hidden md:block w-px self-stretch" style={{ background: c.t07 }} />
              {/* Horizontal divider (mobile) */}
              <div className="md:hidden h-px w-full" style={{ background: c.t07 }} />

              {/* Feedback list */}
              {(atsFeedbackEnhanced.length > 0 || atsFeedback.length > 0) && (
                <div className="flex-1 space-y-5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: c.t36 }}>Detailed Feedback</p>
                    {results.ats_feedback_enhanced && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-500">AI Enhanced</span>}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {atsFeedbackEnhanced.length > 0 ? (
                      atsFeedbackEnhanced.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-2xl p-4 md:p-5" style={{ background: 'rgba(196,133,2,0.04)', border: `1px solid ${c.t07}` }}>
                          <span className="material-symbols-outlined shrink-0 mt-0.5" style={{ fontSize: 20, color: item.type === 'weakness' ? '#ef4444' : item.type === 'strength' ? '#22c55e' : '#C48502' }}>
                            {item.type === 'weakness' ? 'cancel' : item.type === 'strength' ? 'check_circle' : 'info'}
                          </span>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.type && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: c.t05, color: c.t45 }}>{item.type}</span>}
                              {item.priority && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{item.priority}</span>}
                            </div>
                            <MarkdownText className="markdown-relaxed text-sm md:text-base font-medium leading-relaxed min-w-0" style={{ color: item.type === 'weakness' ? c.text : c.t65 }}>
                              {getFeedbackText(item)}
                            </MarkdownText>
                          </div>
                        </div>
                      ))
                    ) : (
                      atsFeedback.map((item, i) => {
                        const feedbackText = getFeedbackText(item)
                        const isNeg = feedbackText.toLowerCase().startsWith('missing') || feedbackText.toLowerCase().startsWith('no ') || feedbackText.toLowerCase().startsWith('low')
                        const clean = feedbackText.replace(/^\[ok\]\s*/i, '').replace(/^\[warn(ing)?\]\s*/i, '').replace(/^\[error\]\s*/i, '').replace(/^\[info\]\s*/i, '')
                        return (
                          <div key={i} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: c.t04, border: `1px solid ${c.t07}` }}>
                            <span className="material-symbols-outlined shrink-0 mt-0.5" style={{ fontSize: 18, color: isNeg ? '#ef4444' : '#C48502' }}>
                              {isNeg ? 'cancel' : 'check_circle'}
                            </span>
                            <MarkdownText className="markdown-relaxed text-sm md:text-base font-medium leading-relaxed min-w-0" style={{ color: isNeg ? c.text : c.t65 }}>
                              {clean}
                            </MarkdownText>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── CTC Breakdown ── */}
        {results.ctc_breakdown && (
          <section className="float-card rounded-[1.5rem] md:rounded-[2rem] p-5 sm:p-6 md:p-12 overflow-hidden relative" style={{ background: c.card, border: `1px solid ${c.t08}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(196,133,2,0.08)', filter: 'blur(70px)', pointerEvents: 'none' }} />
            <div className="relative z-10 space-y-8">
              <div>
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: c.t40 }}>Compensation Intelligence</h3>
                <p className="font-headline text-3xl font-black tracking-tighter" style={{ color: c.text }}>CTC Breakdown</p>
              </div>
              {results.ctc_breakdown.monthly_in_hand != null && (
                <div className="flex items-end gap-3 pb-6" style={{ borderBottom: `1px solid ${c.t08}` }}>
                  <span className="text-3xl md:text-6xl font-black font-headline tracking-tighter leading-none" style={{ color: c.text }}>
                    ₹{Math.round(results.ctc_breakdown.monthly_in_hand * 100)}K
                  </span>
                  <span className="font-semibold text-sm mb-2" style={{ color: c.t45 }}>/ month in-hand</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Base Salary',        key: 'base_salary',        icon: 'account_balance_wallet' },
                  { label: 'HRA',                key: 'hra',                icon: 'home' },
                  { label: 'Performance Bonus',  key: 'performance_bonus',  icon: 'emoji_events' },
                  { label: 'Stocks / ESOPs',     key: 'stocks_esops',       icon: 'trending_up' },
                  { label: 'Special Allowances', key: 'special_allowances', icon: 'savings' },
                  { label: 'Insurance & Benefits', key: 'insurance_benefits', icon: 'health_and_safety' },
                ].map(({ label, key, icon }) => results.ctc_breakdown[key] != null && (
                  <div key={key} className="rounded-2xl p-5 space-y-2" style={{ background: 'rgba(196,133,2,0.05)', border: '1px solid rgba(196,133,2,0.12)' }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base" style={{ color: c.t38 }}>{icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.t45 }}>{label}</span>
                    </div>
                    <p className="text-xl font-black font-headline" style={{ color: c.text }}>₹{results.ctc_breakdown[key]} LPA</p>
                  </div>
                ))}
              </div>
              {results.ctc_breakdown.total_ctc != null && (
                <p className="text-sm font-medium" style={{ color: c.t40 }}>Total CTC: ₹{results.ctc_breakdown.total_ctc} LPA</p>
              )}
            </div>
          </section>
        )}

        {/* ── Matching Section ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">

          <div className="lg:col-span-1 space-y-10">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-2xl font-black tracking-tighter" style={{ color: c.text }}>Target Enterprises</h2>
                <span className="material-symbols-outlined" style={{ color: c.t30 }}>corporate_fare</span>
              </div>
              <div className="space-y-3">
                {companyCards.map((company, i) => {
                  const companyName = getCompanyName(company)
                  const focusAreas = splitListValue(company?.focus_areas)
                  const interviewRounds = splitListValue(company?.interview_rounds)

                  return (
                  <div key={`${companyName}-${i}`} className="float-card p-5 rounded-3xl flex flex-col gap-4" style={{ background: c.card, border: `1px solid ${c.t08}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: i % 2 === 0 ? c.t07 : 'rgba(196,133,2,0.12)' }}>
                        <span className="font-black text-lg italic" style={{ color: c.text }}>{companyName.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base leading-tight responsive-text" style={{ color: c.text }}>{companyName}</p>
                        <p className="text-xs font-medium" style={{ color: c.t45 }}>Top Match</p>
                      </div>
                    </div>
                    {(focusAreas.length > 0 || interviewRounds.length > 0 || company?.difficulty) && (
                      <div className="mt-2 space-y-2">
                        {focusAreas.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {focusAreas.map((fa, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full border font-medium" style={{ borderColor: c.t08, color: c.t65 }}>{fa}</span>
                            ))}
                          </div>
                        )}
                        {interviewRounds.length > 0 && (
                          <p className="text-xs font-medium" style={{ color: c.t50 }}>
                            <span className="font-bold">Interview Rounds:</span> {interviewRounds.join(' -> ')}
                          </p>
                        )}
                        {company?.difficulty && (
                          <p className="text-xs font-medium" style={{ color: c.t50 }}>
                            <span className="font-bold">Difficulty:</span> <span className="capitalize">{company.difficulty}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>

            {topRoles.length > 1 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline text-2xl font-black tracking-tighter" style={{ color: c.text }}>Role Alternatives</h2>
                  <span className="material-symbols-outlined" style={{ color: c.t30 }}>work</span>
                </div>
                <div className="flex flex-col gap-3">
                  {topRoles.slice(1).map((role, i) => (
                    <div key={i} className="float-card flex items-center justify-between gap-3 p-4 rounded-2xl" style={{ background: c.card, border: `1px solid ${c.t08}` }}>
                      <span className="text-sm font-semibold responsive-text min-w-0" style={{ color: c.text }}>{role.role}</span>
                      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: c.text, background: 'rgba(196,133,2,0.12)' }}>{role.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-10">

            {/* Skills */}
            {skillGaps.length > 0 && (
              <div className="float-card p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] space-y-6" style={{ background: c.card, border: `1px solid ${c.t08}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: c.t40 }}>Competency Deep Dive</h3>
                    <p className="font-headline text-2xl font-bold tracking-tight" style={{ color: c.text }}>Skill Analysis</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: c.t45 }}>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#C48502' }} />Strong</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#A67C52' }} />Moderate</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c.t25 }} />Weak</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {skillGaps.map((gap, i) => {
                    const studyPlan = formatMarkdownList(gap.study_plan)

                    return (
                    <div key={i} className={`space-y-3 p-4 md:p-5 rounded-2xl overflow-visible ${studyPlan ? 'md:col-span-2' : ''}`} style={{
                      background: gap.status === 'strong' ? 'rgba(196,133,2,0.07)' : gap.status === 'weak' ? c.t04 : 'rgba(166,124,82,0.05)',
                      border: `1px solid ${c.t07}`,
                    }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm responsive-text min-w-0" style={{ color: c.text }}>{gap.skill}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{
                            background: gap.status === 'strong' ? 'rgba(196,133,2,0.15)' : gap.status === 'weak' ? c.t08 : 'rgba(166,124,82,0.12)',
                            color: c.text,
                          }}>{gap.status}</span>
                          <span className="text-xs font-semibold" style={{ color: c.t45 }}>{gap.current_score} / {gap.target_score}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: c.t08 }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{
                          width: `${Math.min(100, (gap.current_score / gap.target_score) * 100)}%`,
                          background: gap.status === 'strong' ? '#C48502' : gap.status === 'weak' ? c.t28 : '#A67C52',
                        }} />
                      </div>
                      {gap.recommendation && gap.status !== 'strong' && (
                        <MarkdownText className="text-xs font-medium leading-relaxed" style={{ color: c.t58 }}>
                          {gap.recommendation}
                        </MarkdownText>
                      )}
                      {studyPlan && (
                        <div className="mt-4 p-4 md:p-5 rounded-2xl border" style={{ borderColor: 'rgba(196,133,2,0.18)', background: 'rgba(196,133,2,0.055)' }}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-[18px] text-amber-500">menu_book</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">AI Study Plan</span>
                          </div>
                          <MarkdownText className="markdown-relaxed text-sm font-medium leading-relaxed" style={{ color: c.t65 }}>
                            {studyPlan}
                          </MarkdownText>
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>

                {skillGaps.some(g => g.status !== 'strong') && (
                  <p className="text-sm leading-relaxed italic pl-3" style={{ color: c.t50, borderLeft: '2px solid rgba(196,133,2,0.30)' }}>
                    Addressing these gaps is proven to elevate interview success for the {results.predicted_tier} tier.
                  </p>
                )}
              </div>
            )}

            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <div className="space-y-5">
                <h2 className="font-headline text-2xl font-black tracking-tighter" style={{ color: c.text }}>Quick Win Actions</h2>
                <div className="flex flex-col gap-3">
                  {quickActions.map((action, i) => (
                    <div key={i} className="float-card flex gap-4 items-start p-5 rounded-[1.5rem]" style={{ background: c.card, border: `1px solid ${c.t08}` }}>
                      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-sm mt-0.5" style={{ background: c.t07, color: c.text }}>{i + 1}</div>
                      <MarkdownText className="text-sm font-medium leading-relaxed responsive-text min-w-0" style={{ color: c.t65 }}>
                        {action}
                      </MarkdownText>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interview Tips */}
            {interviewTips.length > 0 && (
              <div className="space-y-5">
                <h2 className="font-headline text-2xl font-black tracking-tighter" style={{ color: c.text }}>Interview Preparation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interviewTips.map((tip, i) => (
                    <div key={i} className="float-card flex gap-4 items-start p-5 rounded-[1.5rem]" style={{ background: c.card, border: `1px solid ${c.t08}` }}>
                      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: c.t06, color: c.text }}>
                        <span className="material-symbols-outlined text-xl">lightbulb</span>
                      </div>
                      <MarkdownText className="text-sm font-medium leading-relaxed responsive-text min-w-0" style={{ color: c.t65 }}>
                        {tip}
                      </MarkdownText>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Generated Interview Questions */}
            {interviewQuestions.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <h2 className="font-headline text-2xl font-black tracking-tighter" style={{ color: c.text }}>Mock Questions</h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-500">AI Generated</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interviewQuestions.map((q, i) => (
                    <div key={i} className="float-card flex flex-col gap-3 p-5 rounded-[1.5rem]" style={{ background: c.card, border: `1px solid ${c.t08}` }}>
                      <MarkdownText className="text-sm font-bold leading-relaxed responsive-text" style={{ color: c.text }}>
                        {q.question}
                      </MarkdownText>
                      <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: c.t06 }}>
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.t40 }}>{q.type}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${q.difficulty === 'hard' ? 'text-red-500 bg-red-500/10' : q.difficulty === 'medium' ? 'text-amber-500 bg-amber-500/10' : 'text-green-500 bg-green-500/10'}`}>
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

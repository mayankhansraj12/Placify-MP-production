import { useState, useCallback } from 'react'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { useToast } from '../context/useToast'
import api from '../utils/api'
import { GLSLHills } from '../components/ui/glsl-hills'
import MarkdownText from '../components/MarkdownText'
import ThemedSelect from '../components/ThemedSelect'
import { TARGET_ROLE_OPTIONS } from '../utils/roles'

const panelClass = 'bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl border border-outline-variant/20 dark:border-stone-700/70 shadow-card-md dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition-all duration-500'
const fieldClass = 'w-full bg-white/70 dark:bg-stone-950/45 border border-outline-variant/30 dark:border-stone-700/80 rounded-2xl px-4 py-3 text-left text-on-surface dark:text-stone-100 outline-none transition-all duration-300 focus:border-amber-400 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 dark:focus:ring-amber-400/10 placeholder:text-on-surface-variant/45 dark:placeholder:text-stone-500'
const primaryActionClass = 'inline-flex items-center justify-center gap-2 bg-amber-400 dark:bg-amber-400 text-stone-950 hover:bg-amber-300 dark:hover:bg-amber-300 disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:text-stone-500 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_14px_36px_rgba(196,133,2,0.18)] dark:shadow-[0_14px_36px_rgba(196,133,2,0.22)]'

export default function ResumeEnhance() {
  useDocumentTitle('Resume Enhancer')
  const toast = useToast()
  const [resumeText, setResumeText] = useState('')
  const [targetRole, setTargetRole] = useState(TARGET_ROLE_OPTIONS[0])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!resumeText.trim() || resumeText.trim().length < 100) {
      setError('Please paste at least 100 characters of your resume text.')
      return
    }
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const formData = new FormData()
      formData.append('resume_text', resumeText)
      formData.append('target_role', targetRole)
      const response = await api.post('/resume/enhance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResults(response.data)
      toast.success('Resume analysis complete!')
    } catch (err) {
      let detail = err.response?.data?.detail
      if (Array.isArray(detail)) detail = detail.map(d => d.msg).join(', ')
      setError(detail || 'Enhancement failed. Please try again.')
      toast.error('Enhancement failed')
    } finally {
      setLoading(false)
    }
  }, [resumeText, targetRole, toast])

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="font-body text-on-surface dark:text-stone-100 min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container relative">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <GLSLHills width="100%" height="100%" />
      </div>

      <main className="flex-grow pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 max-w-6xl mx-auto w-full relative z-10 space-y-10 md:space-y-14">
        <header className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-7xl font-black font-headline tracking-tighter leading-none">
            Resume <span className="text-amber-400 dark:text-amber-400">Enhancer</span>
          </h1>
          <p className="text-on-surface-variant dark:text-stone-400 font-light max-w-2xl mx-auto text-sm md:text-lg">
            Paste your resume text and target role to get AI-powered bullet points and formatting suggestions.
          </p>
        </header>

        {error && (
          <div className="p-4 bg-amber-400/10 dark:bg-amber-900/15 border border-amber-400/20 dark:border-amber-400/25 rounded-xl text-amber-400 dark:text-amber-400 font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={`grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 p-5 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-center md:text-left ${panelClass}`}>
          <div className="md:col-span-2 space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400">Resume Content</label>
            <textarea
              className={`${fieldClass} h-64 resize-none leading-relaxed`}
              placeholder="Paste your resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div className="space-y-6 flex flex-col">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400">Target Role</label>
              <ThemedSelect
                value={targetRole}
                options={TARGET_ROLE_OPTIONS}
                onChange={setTargetRole}
                label="Target role"
              />
            </div>

            <button disabled={loading} type="submit" className={`w-full py-4 mt-auto ${primaryActionClass}`}>
              {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">auto_awesome</span>}
              {loading ? 'Enhancing...' : 'Enhance Resume'}
            </button>
          </div>
        </form>

        {results && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className={`${panelClass} p-6 sm:p-8 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center text-center space-y-2 hover:-translate-y-1`}>
                <div className="relative">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-outline-variant/60 dark:text-stone-800" />
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - (results.overall_score || 0) / 100)} className="text-amber-400 dark:text-amber-400 transition-all duration-700" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-black">{results.overall_score || 0}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-500">Overall Score</p>
              </div>

              <div className={`md:col-span-3 ${panelClass} p-6 sm:p-8 rounded-[1.5rem] md:rounded-[2rem] flex flex-col justify-center responsive-text`}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 dark:text-amber-400 mb-2">AI Assessment</h3>
                <MarkdownText className="text-on-surface-variant dark:text-stone-300 leading-relaxed italic">
                  {results.summary}
                </MarkdownText>
              </div>
            </div>

            {results.suggestions?.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold font-headline">Targeted Improvements</h2>
                <div className="grid gap-4">
                  {results.suggestions.map((s, i) => (
                    <div key={i} className={`${panelClass} p-5 sm:p-6 rounded-[1.5rem] group hover:-translate-y-1 hover:border-amber-400/25 dark:hover:border-amber-400/30`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-3 min-w-0 responsive-text">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white/70 dark:bg-stone-800 text-on-surface-variant dark:text-stone-400 rounded-full border border-outline-variant/20 dark:border-stone-700">{s.category || 'general'}</span>
                          </div>
                          <MarkdownText className="text-on-surface-variant/70 dark:text-stone-500 text-sm italic line-through decoration-stone-500/40 responsive-text">
                            {s.original}
                          </MarkdownText>
                          <MarkdownText className="text-amber-400 dark:text-amber-400 font-bold text-lg leading-tight responsive-text">
                            {s.improved || s.enhanced}
                          </MarkdownText>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(s.improved || s.enhanced)}
                          aria-label="Copy improved text"
                          className="p-3 bg-white/70 dark:bg-stone-800/70 hover:bg-amber-400 dark:hover:bg-amber-400 rounded-xl text-on-surface-variant dark:text-stone-400 hover:text-stone-950 transition-all duration-300 hover:-translate-y-0.5 shrink-0 self-start sm:self-auto"
                        >
                          <span className="material-symbols-outlined text-xl">content_copy</span>
                        </button>
                      </div>
                      <div className="mt-4 pt-4 border-t border-outline-variant/20 dark:border-stone-800/80 flex items-start gap-3">
                        <span className="material-symbols-outlined text-amber-400/60 dark:text-amber-400/60 text-sm mt-0.5">info</span>
                        <MarkdownText className="text-xs text-on-surface-variant dark:text-stone-400 leading-relaxed">
                          {s.issue || s.reasoning}
                        </MarkdownText>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

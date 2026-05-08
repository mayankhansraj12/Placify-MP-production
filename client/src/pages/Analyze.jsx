import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import logo from '../assets/logo.png'
import ShaderBackground from '../components/ui/shader-background'
import { GLSLHills } from '../components/ui/glsl-hills'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const COMM_LEVELS = [
  { value: 1, label: 'Basic' },
  { value: 2, label: 'Conversational' },
  { value: 3, label: 'Proficient' },
  { value: 4, label: 'Fluent' },
  { value: 5, label: 'Native / Expert' },
]

export default function Analyze() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [aptitude, setAptitude] = useState(85)
  const [communication, setCommunication] = useState(3)
  const [codingProblems, setCodingProblems] = useState(124)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')


  const getErrorMessage = (err, fallback) => {
    const detail = err.response?.data?.detail
    if (Array.isArray(detail)) return detail[0]?.msg || fallback
    return detail || fallback
  }

  const acceptSelectedFile = (selected) => {
    if (!selected) return
    if (selected.type !== 'application/pdf') { setError('Please upload a PDF file'); return }
    if (selected.size > MAX_FILE_SIZE) { setError('File must be smaller than 5MB'); return }
    setFile(selected); setError('')
  }

  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); acceptSelectedFile(e.dataTransfer.files[0]) }
  const handleFileSelect= (e) => acceptSelectedFile(e.target.files[0])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please upload your resume (PDF)'); return }
    setError(''); setLoading(true)
    try {
      const formData = new FormData()
      formData.append('resume', file)
      formData.append('aptitude_score', aptitude)
      formData.append('communication_score', communication)
      formData.append('coding_problems_solved', codingProblems)
      const res = await api.post('/analysis', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate(`/results/${res.data.id}`, { state: { analysis: res.data } })
    } catch (err) {
      setError(getErrorMessage(err, 'Analysis failed. Please try again.'))
      setLoading(false)
    }
  }

  return (
    <div className="font-body text-on-surface dark:text-stone-100 min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container relative">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <GLSLHills width="100%" height="100%" />
      </div>
      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col items-center justify-center pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full relative z-10">

        {/* Header Section */}
        <header className="text-center mb-8 md:mb-16 space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-7xl font-black font-headline tracking-tighter text-on-surface dark:text-stone-100 leading-none">
            Analyze <span className="text-amber-400 dark:text-amber-400">Intelligence.</span>
          </h1>
          <p className="text-sm md:text-lg text-on-surface-variant dark:text-stone-400 max-w-xl mx-auto font-light">
            Upload your portfolio and calibrate your core competencies for high-precision career placement matching.
          </p>
        </header>

        {error && (
          <div className="w-full max-w-2xl mb-8 p-4 bg-amber-400/10 dark:bg-amber-900/15 border border-amber-400/20 dark:border-amber-400/20 rounded-xl text-center text-amber-400 dark:text-amber-400 font-bold">
            {error}
          </div>
        )}

        {/* Dynamic Grid Layout */}
        <form onSubmit={handleSubmit} className="w-full pointer-events-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 w-full items-stretch">

            {/* Left: Upload Dropzone */}
            <section className="lg:col-span-7 group">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={`h-full min-h-[200px] md:min-h-[320px] border-2 border-dashed ${dragOver ? 'border-amber-400 dark:border-amber-400 bg-amber-400/10 dark:bg-amber-900/15' : 'border-amber-400/25 dark:border-stone-600'} rounded-[1.5rem] md:rounded-[2rem] bg-surface-container-lowest/30 backdrop-blur-md p-5 sm:p-6 md:p-12 flex flex-col items-center justify-center hover:border-amber-400 dark:hover:border-amber-400 hover:bg-amber-400/10 dark:hover:bg-stone-800/40 group-hover:shadow-[0_40px_80px_rgba(196,133,2,0.10)] relative overflow-hidden cursor-pointer`}
                style={{ transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
              >
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-400/10 blur-[100px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-400/10 blur-[100px] rounded-full" />

                <input id="resume-upload" ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  {file ? (
                    <>
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-amber-400/10 dark:bg-amber-400/10 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.12)] transition-transform duration-500 group-hover:scale-110">
                        <span className="material-symbols-outlined text-3xl md:text-5xl text-amber-400 dark:text-amber-400">check_circle</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-headline font-bold tracking-tight text-amber-400 dark:text-amber-400 break-all">{file.name}</h3>
                        <p className="text-amber-400/70 dark:text-amber-400/60 font-medium">{(file.size / 1024).toFixed(0)} KB · Click to replace</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-amber-400/10 dark:bg-amber-400/10 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.12)] transition-transform duration-500 group-hover:scale-110">
                        <span className="material-symbols-outlined text-3xl md:text-5xl text-amber-400 dark:text-amber-400">cloud_upload</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl md:text-3xl font-headline font-bold tracking-tight text-on-surface dark:text-stone-100">Upload Portfolio</h3>
                        <p className="text-on-surface-variant dark:text-stone-400 font-medium">Drag and drop your PDF file here</p>
                      </div>
                    </>
                  )}
                  <button type="button" className="mt-4 px-5 py-2 md:px-8 md:py-3 bg-surface-container-highest/50 dark:bg-stone-700/60 rounded-full font-headline font-bold text-sm tracking-tighter uppercase border border-outline-variant/20 dark:border-stone-600/30 hover:bg-surface-container-highest dark:hover:bg-stone-700 dark:text-stone-200 transition-colors">
                    Browse Files
                  </button>
                </div>
              </div>
            </section>

            {/* Right: Configuration Controls */}
            <section className="lg:col-span-5">
              <div className="glass-card h-full rounded-[2rem] p-6 md:p-10 space-y-6 md:space-y-8 shadow-card flex flex-col bg-white/50 dark:bg-stone-900/60 text-center md:text-left">
                <h4 className="text-base md:text-xl font-headline font-bold tracking-tight border-b border-outline-variant/10 dark:border-white/10 pb-6 text-[#111111] dark:text-stone-100">Calibration Profiles</h4>

                {/* Aptitude Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant dark:text-stone-400">Aptitude Score</label>
                    <span className="text-amber-400 dark:text-amber-400 font-bold font-headline text-2xl">{aptitude}<span className="text-xs text-on-surface-variant/60 dark:text-stone-500 ml-1">%</span></span>
                  </div>
                  <input className="w-full" max="100" min="0" type="range" value={aptitude} onChange={(e) => setAptitude(Number(e.target.value))} />
                </div>

                {/* Communication — segmented pill buttons */}
                <div className="space-y-3">
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant dark:text-stone-400">Communication Style</label>
                  <div className="flex gap-2">
                    {COMM_LEVELS.map(l => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => setCommunication(l.value)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-headline transition-all ${
                          communication === l.value
                            ? 'bg-amber-400 dark:bg-amber-400 text-stone-950 shadow-sm'
                            : 'bg-white/60 dark:bg-stone-800/60 text-on-surface-variant dark:text-stone-400 border border-outline-variant/20 dark:border-stone-700 hover:bg-white dark:hover:bg-stone-700'
                        }`}
                      >
                        {l.value}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant/60 dark:text-stone-500 font-medium">{COMM_LEVELS.find(l => l.value === communication)?.label}</p>
                </div>

                {/* Solved Problems Numeric */}
                <div className="space-y-4">
                  <label className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant dark:text-stone-400">Complex Problems Solved</label>
                  <div className="flex items-center bg-white/60 dark:bg-stone-800/60 border border-outline-variant/20 dark:border-stone-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/40 dark:focus-within:ring-amber-400/40">
                    <span className="material-symbols-outlined px-4 text-on-surface-variant dark:text-stone-400">terminal</span>
                    <input className="number-input-clean w-full border-none bg-transparent py-4 text-on-surface dark:text-stone-100 font-bold focus:ring-0 outline-none text-center md:text-left" placeholder="000" type="number" min="0" value={codingProblems} onChange={(e) => setCodingProblems(Number(e.target.value))} />
                  </div>
                </div>

                <div className="mt-auto pt-6 text-center">
                  <p className="text-[10px] text-on-surface-variant dark:text-stone-500 uppercase tracking-[0.2em] font-bold">Calibration Active</p>
                </div>
              </div>
            </section>
          </div>

          {/* Call to Action */}
          <div className="mt-8 md:mt-20 w-full max-w-xl mx-auto flex flex-col items-center">
            <button disabled={loading} type="submit" className="group w-full relative overflow-hidden py-4 md:py-8 px-4 sm:px-6 md:px-12 bg-amber-400 dark:bg-amber-400 text-stone-950 rounded-[1.5rem] md:rounded-[2rem] font-headline font-black text-base sm:text-lg md:text-3xl tracking-tighter uppercase transition-all duration-500 hover:bg-amber-300 dark:hover:bg-amber-300 hover:shadow-[0_20px_60px_rgba(196,133,2,0.32)] active:scale-95 disabled:opacity-50">
              <div className="absolute inset-0 bg-white/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6">
                <span>{loading ? 'Processing Neural Data...' : 'Launch AI Engine'}</span>
                <span className={`material-symbols-outlined text-2xl md:text-4xl ${loading ? 'animate-spin' : 'animate-pulse'}`}>{loading ? 'sync' : 'bolt'}</span>
              </div>
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/20 dark:bg-amber-200/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            </button>
            <p className="text-center mt-6 text-on-surface-variant/60 dark:text-stone-500 font-medium text-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              Data is encrypted and processed in isolated VPC environments.
            </p>
          </div>
        </form>
      </main>

      {false && (
      <footer className="w-full py-16 px-12 grid grid-cols-1 md:grid-cols-4 gap-12 text-on-surface-variant relative z-10 bg-white/40 border-t border-outline-variant/10 overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/10 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
        <div className="md:col-span-1 space-y-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Placify AI" className="h-8 w-auto" />
            <span className="text-lg font-bold text-[#111111] font-headline">Placify AI</span>
          </div>
          <p className="text-on-surface-variant text-sm font-body leading-relaxed">
            The future of precision recruitment. Engineered for speed, built for intelligence.
          </p>
        </div>
        <div className="space-y-4 relative z-10">
          <h5 className="text-[#111111] font-medium text-sm">Solutions</h5>
          <div className="flex flex-col gap-3">
            <Link className="text-on-surface-variant hover:text-primary-container transition-colors duration-200 text-sm" to="#">Portfolio Analysis</Link>
            <Link className="text-on-surface-variant hover:text-primary-container transition-colors duration-200 text-sm" to="#">Skill Calibration</Link>
          </div>
        </div>
        <div className="space-y-4 relative z-10">
          <h5 className="text-[#111111] font-medium text-sm">Company</h5>
          <div className="flex flex-col gap-3">
            <Link className="text-on-surface-variant hover:text-primary-container transition-colors duration-200 text-sm" to="#">Privacy</Link>
            <Link className="text-on-surface-variant hover:text-primary-container transition-colors duration-200 text-sm" to="#">Terms</Link>
          </div>
        </div>
        <div className="space-y-4 relative z-10">
          <h5 className="text-[#111111] font-medium text-sm">Legal</h5>
          <p className="text-on-surface-variant text-xs leading-relaxed">© 2026 Placify AI. All rights reserved. Prices in ₹.</p>
          <div className="flex gap-4 mt-2">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-[#111111] cursor-pointer transition-colors">public</span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-[#111111] cursor-pointer transition-colors">share</span>
          </div>
        </div>
      </footer>
      )}
    </div>
  )
}

import { useState } from 'react'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import logo from '../assets/logo.png'
import { getAuthErrorMessage } from '../utils/authErrors'

export default function Login() {
  useDocumentTitle('Sign In')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const authError = searchParams.get('authError') || ''
  const visibleError = error || authError
  const { login, startOAuth } = useAuth()
  const navigate = useNavigate()

  const clearAuthErrorFromUrl = () => {
    if (!searchParams.get('authError')) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('authError')
    setSearchParams(nextParams, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearAuthErrorFromUrl()
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Login failed'))
    }
  }

  const handleProviderAuth = async (provider) => {
    clearAuthErrorFromUrl()
    setError('')
    try {
      await startOAuth(provider)
    } catch (err) {
      setError(getAuthErrorMessage(err, `${provider} sign-in failed`))
    }
  }

  return (
    <div className="bg-surface font-body min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      <div className="flex-grow flex items-center justify-center p-4">
        {/* Auth Container */}
        <main className="w-full max-w-[900px] bg-[#111111] flex flex-col md:flex-row rounded-3xl overflow-hidden cinematic-shadow min-h-[640px]">
        {/* Left Side: Brand & Visuals (40%) */}
        <section className="hidden md:flex md:w-2/5 relative flex-col justify-between p-10 overflow-hidden bg-gradient-to-br from-[#AAAAAA] via-[#555555] to-[#111111]">
          {/* Decorative Grain/Noise Overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"></div>
          {/* Brand Identity */}
          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity">
              <img src={logo} alt="Placify AI" className="h-9 w-auto brightness-0 invert" />
              <h1 className="font-headline font-black text-white text-2xl tracking-tighter">Placify AI</h1>
            </Link>
            <h2 className="font-headline text-4xl font-extrabold text-white leading-tight tracking-tighter">
              Empowering <br/>Your Future.
            </h2>
          </div>
          {/* Glass Quote Card */}
          <div className="relative z-10 glass-border bg-white/10 backdrop-blur-2xl p-6 rounded-2xl shadow-lav self-start max-w-[280px]">
            <span className="material-symbols-outlined text-secondary-container mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
            <p className="text-white/90 text-sm leading-relaxed mb-5 font-medium">
              The future belongs to those who learn more skills and combine them in creative ways.
            </p>
            <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Robert Greene</p>
          </div>
          {/* Background Abstract Shape */}
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-container rounded-full mix-blend-screen filter blur-[100px] opacity-40"></div>
        </section>

        {/* Right Side: Form (60%) */}
        <section className="md:w-3/5 bg-[#111111] p-10 md:p-16 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <header className="mb-10">
              <h2 className="font-headline text-3xl font-extrabold text-white tracking-tight mb-2">Welcome Back</h2>
              <p className="text-white/50 text-sm">Please enter your details to continue your journey.</p>
            </header>

            {visibleError && <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-sm font-medium">{visibleError}</div>}

            {/* Auth Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest ml-1" htmlFor="email">Work Email</label>
                <div className="relative">
                  <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-container/50 transition-all" id="email" placeholder="name@company.com" type="email" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest" htmlFor="password">Password</label>
                </div>
                <div className="relative">
                  <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-container/50 transition-all" id="password" placeholder="••••••••" type="password" autoComplete="current-password" />
                </div>
              </div>
              <button className="w-full py-4 bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-fixed font-headline font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,0,0,0.08)]" type="submit">
                Sign In to Dashboard
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-10 flex items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">or continue with</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* Social Auth */}
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => handleProviderAuth('google')} className="flex items-center justify-center gap-3 py-3 px-4 glass-border bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                <svg className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.34-2.12 4.41-1.3 1.15-3.04 1.83-5.72 1.83-5.22 0-9.42-4.23-9.42-9.45s4.2-9.45 9.42-9.45c2.84 0 4.94 1.1 6.44 2.52l2.31-2.31C18.96 1.41 16.03 0 12.48 0 5.86 0 .5 5.37.5 12s5.36 12 11.98 12c3.54 0 6.44-1.16 8.59-3.41 2.22-2.32 2.92-5.59 2.92-8.15 0-.61-.05-1.19-.15-1.72h-11.36z"></path>
                </svg>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Google</span>
              </button>
              <button type="button" onClick={() => handleProviderAuth('github')} className="flex items-center justify-center gap-3 py-3 px-4 glass-border bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                <svg className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                </svg>
                <span className="text-xs font-bold text-white uppercase tracking-wider">GitHub</span>
              </button>
            </div>

            <footer className="mt-12 text-center">
              <p className="text-white/40 text-xs font-medium">
                Don't have an account? 
                <Link className="text-secondary-container font-bold hover:underline ml-1" to="/register">Get Started</Link>
              </p>
            </footer>
          </div>
        </section>
        </main>
      </div>
    </div>
  )
}

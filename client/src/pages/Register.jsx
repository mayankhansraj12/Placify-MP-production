import { useState } from 'react'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import logo from '../assets/logo.png'
import { getAuthErrorMessage } from '../utils/authErrors'

export default function Register() {
  useDocumentTitle('Create Account')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters")
      return
    }
    
    try {
      await register(name, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Registration failed. Try again.'))
    }
  }

  return (
    <div className="bg-surface font-body min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      <div className="flex-grow flex items-center justify-center p-4">
        {/* Auth Container */}
        <main className="w-full max-w-[900px] bg-[#111111] flex flex-col md:flex-row rounded-3xl overflow-hidden cinematic-shadow min-h-[640px]">
        {/* Left Side: Brand & Visuals (40%) */}
        <section className="md:w-2/5 relative flex flex-col justify-between p-10 overflow-hidden bg-gradient-to-br from-[#AAAAAA] via-[#555555] to-[#111111]">
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"></div>
          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity">
              <img src={logo} alt="Placify AI" className="h-9 w-auto brightness-0 invert" />
              <h1 className="font-headline font-black text-white text-2xl tracking-tighter">Placify AI</h1>
            </Link>
            <h2 className="font-headline text-4xl font-extrabold text-white leading-tight tracking-tighter">
              Start Your <br/>Journey.
            </h2>
          </div>
          <div className="relative z-10 glass-border bg-white/10 backdrop-blur-2xl p-6 rounded-2xl shadow-lav self-start max-w-[280px]">
            <span className="material-symbols-outlined text-secondary-container mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
            <p className="text-white/90 text-sm leading-relaxed mb-6 font-medium">
              Join thousands of students who have cracked their dream jobs with our actionable intelligence.
            </p>
          </div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-container rounded-full mix-blend-screen filter blur-[100px] opacity-40"></div>
        </section>

        {/* Right Side: Form (60%) */}
        <section className="md:w-3/5 bg-[#111111] p-10 md:p-16 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <header className="mb-8">
              <h2 className="font-headline text-3xl font-extrabold text-white tracking-tight mb-2">Create Account</h2>
              <p className="text-white/50 text-sm">Join Placify AI to analyze your placement potential.</p>
            </header>

            {error && <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-sm font-medium">{error}</div>}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest ml-1" htmlFor="name">Full Name</label>
                <div className="relative">
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-container/50 transition-all" id="name" placeholder="John Doe" type="text" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest ml-1" htmlFor="email">Work Email</label>
                <div className="relative">
                  <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-container/50 transition-all" id="email" placeholder="name@company.com" type="email" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest" htmlFor="password">Password</label>
                <div className="relative">
                  <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-container/50 transition-all" id="password" placeholder="••••••••" type="password" autoComplete="new-password" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative">
                  <input required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-container/50 transition-all" id="confirmPassword" placeholder="••••••••" type="password" autoComplete="new-password" />
                </div>
              </div>
              
              <button className="w-full py-4 mt-2 bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-fixed font-headline font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,0,0,0.08)]" type="submit">
                Create Account
              </button>
            </form>

            <footer className="mt-8 text-center">
              <p className="text-white/40 text-xs font-medium">
                Already have an account? 
                <Link className="text-secondary-container font-bold hover:underline ml-1" to="/login">Sign In</Link>
              </p>
            </footer>
          </div>
        </section>
        </main>
      </div>
    </div>
  )
}

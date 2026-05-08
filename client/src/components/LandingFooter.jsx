import logo from '../assets/logo.png'

export default function LandingFooter() {
  return (
    <footer className="bg-[#111111] dark:bg-stone-900 text-on-surface-variant font-body tracking-tight text-sm z-20 relative">
      <div className="w-full py-16 px-6 md:px-12 flex flex-col md:flex-row justify-between items-start gap-12 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Placify AI" className="h-8 w-auto brightness-0 invert" />
            <span className="text-lg font-bold text-white tracking-tighter">Placify AI</span>
          </div>
          <p className="text-stone-400 max-w-xs leading-relaxed">
            Redefining career readiness through ethereal intelligence and editorial-grade data mapping.
          </p>
        </div>

        <div className="space-y-6 md:w-72">
          <h4 className="text-white font-medium uppercase text-xs tracking-widest">Subscribe</h4>
          <div className="relative">
            <input
              className="w-full bg-white/5 border-none rounded-full px-6 py-3 text-white/80 focus:ring-2 focus:ring-primary-container/50 outline-none placeholder:text-white/30"
              placeholder="Email address"
              type="email"
            />
            <button className="absolute right-2 top-2 px-3 py-1.5 text-primary-container hover:text-white font-bold" type="button">
              →
            </button>
          </div>
        </div>
      </div>

      <div className="w-full py-8 px-6 md:px-12 border-t border-white/10 text-center text-stone-500">
        <p>© 2026 Placify AI. All rights reserved.</p>
      </div>
    </footer>
  )
}

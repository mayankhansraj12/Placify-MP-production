import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(_error, _errorInfo) {
    // In production, integrate with an error reporting service (e.g. Sentry)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#141210] text-stone-100 font-body p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-900/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-amber-500">warning</span>
            </div>
            <h1 className="text-2xl font-headline font-bold tracking-tight">Something went wrong</h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              An unexpected error occurred. Please try again or return to the dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-xl font-bold text-sm uppercase tracking-widest transition-colors"
              >
                Try Again
              </button>
              <a
                href="/dashboard"
                className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-bold text-sm uppercase tracking-widest transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

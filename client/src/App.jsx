import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuth } from './context/useAuth'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'

// Lazy-load all pages for code splitting — dramatically reduces initial bundle size
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Analyze = lazy(() => import('./pages/Analyze'))
const Results = lazy(() => import('./pages/Results'))
const ResumeEnhance = lazy(() => import('./pages/ResumeEnhance'))
const MockInterview = lazy(() => import('./pages/MockInterview'))
const CareerCoach = lazy(() => import('./pages/CareerCoach'))

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Navbar />
      <Outlet />
    </ProtectedRoute>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/enhance" element={<ResumeEnhance />} />
        <Route path="/resume/enhance" element={<Navigate to="/enhance" replace />} />
        <Route path="/interview" element={<MockInterview />} />
        <Route path="/coach" element={<CareerCoach />} />
      </Route>

      <Route path="*" element={<Navigate to={!loading && user ? '/dashboard' : '/'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AppContent />
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  )
}

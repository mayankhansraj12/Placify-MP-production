import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function OAuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      navigate(user ? '/dashboard' : '/login?authError=' + encodeURIComponent('OAuth sign-in failed. Please try again.'), { replace: true })
    }
  }, [loading, user, navigate])

  return <div className="min-h-screen bg-surface" />
}

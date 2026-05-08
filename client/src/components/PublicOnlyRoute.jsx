import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

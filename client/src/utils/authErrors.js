export function getAuthErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first === 'string' && first.trim()) {
      return first
    }
    if (first?.msg) {
      return first.msg
    }
  }

  if (error?.message === 'Network Error') {
    return 'Unable to reach the server. Please try again.'
  }

  return fallback
}

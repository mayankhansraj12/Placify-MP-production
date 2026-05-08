import { useEffect } from 'react'

/**
 * Sets the document title for a given page.
 * Appends " — Placify AI" suffix for consistent branding.
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} — Placify AI` : 'Placify AI'
    return () => { document.title = prev }
  }, [title])
}

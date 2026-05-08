export default function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />
}

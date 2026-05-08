import { FiInfo } from 'react-icons/fi'

export default function MetricTooltip({ text, label = 'More info' }) {
  return (
    <span className="metric-tooltip" tabIndex={0} aria-label={label}>
      <FiInfo />
      <span className="metric-tooltip-content">{text}</span>
    </span>
  )
}

import { FiAward, FiUsers } from 'react-icons/fi'

export default function ResultsReadinessSection({ results }) {
  return (
    <div className="grid-2 results-section-gap">
      <div className="glass-card fade-in fade-in-delay-3">
        <div className="section-header">
          <FiAward className="icon" /> Industry Readiness
        </div>
        <div className="results-big-stat-wrap">
          <div className="results-big-stat accent" aria-label={`Industry readiness ${results.industry_readiness} percent`}>
            {results.industry_readiness}%
          </div>
          <div className="results-big-stat-caption">
            {results.industry_readiness >= 80 ? "Excellent - you're ready!" : results.industry_readiness >= 60 ? 'Good - keep improving!' : 'Needs work - follow the recommendations'}
          </div>
          <div className="progress-bar results-big-stat-progress">
            <div className="progress-fill" style={{ width: `${results.industry_readiness}%` }}></div>
          </div>
        </div>
      </div>

      <div className="glass-card fade-in fade-in-delay-3">
        <div className="section-header">
          <FiUsers className="icon" /> Peer Comparison
        </div>
        <div className="results-big-stat-wrap">
          <div className="results-big-stat success" aria-label={`Peer percentile ${results.peer_percentile}th`}>
            {results.peer_percentile}th
          </div>
          <div className="results-big-stat-caption">
            Percentile - better than {results.peer_percentile}% of comparable candidates
          </div>
        </div>
      </div>
    </div>
  )
}

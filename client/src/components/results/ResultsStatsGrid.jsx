import MetricTooltip from '../MetricTooltip'
import { FiAward, FiDollarSign, FiTrendingUp, FiUsers } from 'react-icons/fi'

export default function ResultsStatsGrid({ results }) {
  return (
    <div className="grid-4 fade-in fade-in-delay-2">
      <div className="glass-card stat-card tone-info">
        <div className="kpi-head">
          <span className="kpi-icon"><FiDollarSign /></span>
          <span className="kpi-sub">Compensation</span>
        </div>
        <div className="stat-value stat-value-solid" aria-label={`Expected compensation INR ${results.salary_range?.expected} lakh`}>
          INR {results.salary_range?.expected}L
        </div>
        <div className="stat-label">Expected CTC</div>
      </div>
      <div className="glass-card stat-card tone-accent">
        <div className="kpi-head">
          <span className="kpi-icon"><FiTrendingUp /></span>
          <span className="kpi-sub">Placement Reach</span>
        </div>
        <div className="stat-value stat-value-solid" aria-label={`FAANG probability ${results.faang_probability} percent`}>
          {results.faang_probability}%
        </div>
        <div className="stat-label">FAANG Probability</div>
      </div>
      <div className="glass-card stat-card tone-success">
        <div className="kpi-head">
          <span className="kpi-icon"><FiAward /></span>
          <span className="kpi-sub">Profile Quality</span>
        </div>
        <div className="stat-value stat-value-solid" aria-label={`Resume strength ${results.resume_strength}`}>
          {results.resume_strength}
        </div>
        <div className="stat-label">
          Resume Strength <MetricTooltip text="Estimated from extracted skill/domain coverage, projects, internships, and certifications." />
        </div>
      </div>
      <div className="glass-card stat-card tone-info">
        <div className="kpi-head">
          <span className="kpi-icon"><FiUsers /></span>
          <span className="kpi-sub">Market Position</span>
        </div>
        <div className="stat-value stat-value-solid" aria-label={`Peer ranking top ${100 - results.peer_percentile} percent`}>
          Top {100 - results.peer_percentile}%
        </div>
        <div className="stat-label">
          Peer Ranking <MetricTooltip text="Relative standing among analyzed candidate profiles." />
        </div>
      </div>
    </div>
  )
}

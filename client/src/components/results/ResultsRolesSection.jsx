import { FiBriefcase } from 'react-icons/fi'

export default function ResultsRolesSection({ topRoles }) {
  return (
    <div className="grid-2 results-section-gap">
      <div className="glass-card fade-in fade-in-delay-3">
        <div className="section-header">
          <FiBriefcase className="icon" /> Top Predicted Roles
        </div>
        <p className="sr-only">Top role probabilities are shown in descending order from model output.</p>
        {topRoles?.map((role, index) => (
          <div key={role.role} className="results-role-row">
            <div className="results-role-row-head">
              <span className="results-role-row-title">
                #{index + 1} {role.role}
              </span>
              <span className="results-role-row-score">{role.probability}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${role.probability}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

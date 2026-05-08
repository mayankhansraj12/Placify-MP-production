import { useState } from 'react'
import { FiTarget, FiStar, FiChevronDown, FiChevronUp } from 'react-icons/fi'

export default function ResultsSkillTable({ skillGaps }) {
  const [expandedSkill, setExpandedSkill] = useState(null)

  const toggleSkill = (skill) => {
    setExpandedSkill(expandedSkill === skill ? null : skill)
  }

  return (
    <div className="glass-card fade-in fade-in-delay-4 results-section-gap">
      <div className="section-header">
        <FiTarget className="icon" /> Skill Gap Analysis
      </div>
      <div className="results-table-wrap">
        <table className="skill-table" aria-label="Skill gap analysis table">
          <caption>Current skills vs role target benchmarks and recommendations.</caption>
          <thead>
            <tr>
              <th scope="col">Skill</th>
              <th scope="col">Score</th>
              <th scope="col">Target</th>
              <th scope="col">Gap</th>
              <th scope="col">Status</th>
              <th scope="col">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {skillGaps?.map((gap) => (
              <tr key={gap.skill} className={expandedSkill === gap.skill ? 'skill-row-expanded' : ''}>
                <td className="results-skill-name">
                  {gap.skill}
                  {gap.study_plan && (
                    <button
                      className="skill-plan-toggle"
                      onClick={() => toggleSkill(gap.skill)}
                      aria-label={`Toggle study plan for ${gap.skill}`}
                    >
                      {expandedSkill === gap.skill ? <FiChevronUp /> : <FiChevronDown />}
                      <span className="skill-plan-toggle-label">Plan</span>
                    </button>
                  )}
                </td>
                <td>{gap.current_score}</td>
                <td>{gap.target_score}</td>
                <td>{gap.gap > 0 ? gap.gap : '-'}</td>
                <td>
                  <span className={`status-${gap.status}`}>
                    {gap.status === 'strong' ? 'Strong' : gap.status === 'moderate' ? 'Moderate' : 'Weak'}
                  </span>
                </td>
                <td className="results-skill-reco">
                  {gap.recommendation}
                  {gap.matched_resources?.length > 0 && (
                    <div className="skill-resources">
                      {gap.matched_resources.map((res, i) => (
                        <a key={i} href={res.url} target="_blank" rel="noopener noreferrer"
                           className="skill-resource-link" title={res.title}>
                          📚 {res.title}
                          {res.duration && <span className="skill-resource-duration">{res.duration}</span>}
                        </a>
                      ))}
                    </div>
                  )}
                  {/* F2: LLM-generated study plan */}
                  {gap.study_plan && expandedSkill === gap.skill && (
                    <div className="skill-study-plan">
                      <div className="skill-study-plan-header">
                        <FiStar /> Personalized Study Plan
                        <span className="ai-badge-inline"><FiStar /> AI-Generated</span>
                      </div>
                      <div className="skill-study-plan-text">
                        {gap.study_plan.split('\n').filter(l => l.trim()).map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

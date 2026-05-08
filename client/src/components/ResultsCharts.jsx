import { lazy, memo, Suspense, useMemo } from 'react'
import { FiTarget, FiTrendingUp } from 'react-icons/fi'
import SkeletonBlock from './SkeletonBlock'

const DomainSkillChart = lazy(() => import('./charts/DomainSkillChart'))
const TierProbabilityChart = lazy(() => import('./charts/TierProbabilityChart'))

function ResultsCharts({ radarData, tierData }) {
  const radarSummary = useMemo(
    () => radarData.map((item) => `${item.subject} ${item.score}`).join(', '),
    [radarData],
  )
  const cleanedTierData = useMemo(
    () => tierData
      .map((item) => ({ ...item, probability: Number(item.probability || 0) }))
      .sort((a, b) => b.probability - a.probability)
      .filter((item) => item.probability > 0.05),
    [tierData],
  )
  const tierSummary = useMemo(
    () => cleanedTierData.map((item) => `${item.name} ${item.probability} percent`).join(', '),
    [cleanedTierData],
  )
  const chartFallback = (
    <div className="results-chart-fallback">
      <SkeletonBlock className="skeleton-title" />
      <SkeletonBlock className="skeleton-line-lg" />
    </div>
  )

  return (
    <div className="grid-2 results-section-gap fade-in fade-in-delay-3">
      <div className="glass-card">
        <div className="section-header">
          <FiTarget className="icon" /> Domain Skill Scores
        </div>
        <p className="sr-only">Domain skill chart values: {radarSummary}</p>
        <Suspense fallback={chartFallback}>
          <DomainSkillChart radarData={radarData} summary={radarSummary} />
        </Suspense>
      </div>

      <div className="glass-card">
        <div className="section-header">
          <FiTrendingUp className="icon" /> Company Tier Probability
        </div>
        <p className="sr-only">Tier probability values: {tierSummary}</p>
        <Suspense fallback={chartFallback}>
          <TierProbabilityChart tierData={cleanedTierData} summary={tierSummary} />
        </Suspense>
      </div>
    </div>
  )
}

export default memo(ResultsCharts)

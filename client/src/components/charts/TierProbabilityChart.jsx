import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9']

export default function TierProbabilityChart({ tierData, summary }) {
  if (!tierData?.length) return null

  const cleanedTierData = tierData
    .map((item) => ({ ...item, probability: Number(item.probability || 0) }))
    .sort((a, b) => b.probability - a.probability)
    .filter((item) => item.probability > 0.05)

  if (!cleanedTierData.length) return null

  return (
    <div role="region" aria-label={`Company tier probability chart. ${summary}`}>
      <ResponsiveContainer width="99%" height={320}>
        <BarChart data={cleanedTierData} layout="vertical" margin={{ left: 10, right: 14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: '#f1f5f9' }}
          />
          <Bar dataKey="probability" radius={[0, 6, 6, 0]} label={{ position: 'right', formatter: (value) => `${Number(value).toFixed(1)}%`, fill: '#94a3b8', fontSize: 11 }}>
            {cleanedTierData.map((entry, index) => (
              <Cell key={entry.name} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

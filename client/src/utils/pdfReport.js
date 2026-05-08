import jsPDF from 'jspdf'

export function generateReport(results, userName) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // ── Header Banner ──────────────────────────────────────────────────────────
  doc.setFillColor(17, 17, 17) // p-dark
  doc.rect(0, 0, pageWidth, 45, 'F')
  
  // Dashboard accent line
  doc.setFillColor(196, 133, 2) // dashboard accent
  doc.rect(0, 45, pageWidth, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('Placify AI', 15, 22)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  doc.text('AI-Driven Placement Intelligence Platform', 15, 30)
  
  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}`, 15, 38)
  
  if (userName) {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(userName.toUpperCase(), pageWidth - 15, 25, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 180, 180)
    doc.text('Verified Candidate Report', pageWidth - 15, 32, { align: 'right' })
  }

  y = 60

  const addSection = (title) => {
    if (y > 250) {
      doc.addPage()
      y = 25
    }
    
    // Section Background Accent
    doc.setFillColor(196, 133, 2, 0.1) // light accent bg
    doc.rect(15, y - 6, pageWidth - 30, 9, 'F')
    
    doc.setTextColor(17, 17, 17)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), 20, y)
    
    doc.setDrawColor(17, 17, 17)
    doc.setLineWidth(0.5)
    doc.line(15, y + 5, pageWidth - 15, y + 5)
    
    y += 15
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
  }

  const addRow = (label, value) => {
    if (y > 275) {
      doc.addPage()
      y = 25
    }
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text(label, 20, y)
    
    doc.setTextColor(17, 17, 17)
    doc.setFont('helvetica', 'bold')
    doc.text(String(value || 'N/A'), 110, y)
    
    // Subtle dotted separator
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.1)
    doc.line(20, y + 2, pageWidth - 20, y + 2)
    
    y += 9
  }

  // ── CONTENT ──────────────────────────────────────────────────────────────

  addSection('Strategic Placement Metrics')
  addRow('Predicted Job Role:', results.predicted_role)
  addRow('Estimated Company Tier:', results.predicted_tier)
  addRow('Analytical Confidence:', `${results.overall_confidence}%`)
  addRow('MAANG/Top-Tier Probability:', `${results.faang_probability}%`)
  addRow('Resume ATS Strength:', `${results.resume_strength}/100`)
  addRow('Market Readiness Index:', `${results.industry_readiness}%`)
  addRow('Competitive Percentile:', `Top ${Math.max(1, 100 - (results.peer_percentile || 0))}%`)
  y += 8

  addSection('Compensation Forecast')
  addRow('Target CTC (Median):', `INR ${results.salary_range?.expected || 0} LPA`)
  addRow('Market Range:', `INR ${results.salary_range?.low || 0} - INR ${results.salary_range?.high || 0} LPA`)
  y += 8

  if (results.domain_scores) {
    addSection('Core Competency Matrix')
    Object.entries(results.domain_scores).forEach(([domain, score]) => {
      addRow(`${domain}:`, `${score}/100`)
    })
    y += 8
  }

  if (results.skill_gaps && results.skill_gaps.length > 0) {
    addSection('Skill Inventory & Gap Analysis')
    results.skill_gaps.forEach((gap) => {
      if (y > 255) {
        doc.addPage()
        y = 25
      }
      
      doc.setFont('helvetica', 'bold')
      if (gap.status === 'strong') doc.setTextColor(22, 163, 74) // green-600
      else if (gap.status === 'moderate') doc.setTextColor(156, 101, 0) // dashboard accent dark
      else doc.setTextColor(220, 38, 38) // red-600
      
      doc.text(`${gap.skill} [${gap.status.toUpperCase()}]`, 20, y)
      
      doc.setTextColor(17, 17, 17)
      doc.setFont('helvetica', 'normal')
      doc.text(`${gap.current_score}/${gap.target_score}`, pageWidth - 25, y, { align: 'right' })
      
      y += 6
      if (gap.recommendation) {
        const lines = doc.splitTextToSize(gap.recommendation, pageWidth - 45)
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(lines, 25, y)
        y += (lines.length * 5) + 6
        doc.setFontSize(10)
      }
    })
    y += 4
  }

  if (results.quick_actions && results.quick_actions.length > 0) {
    addSection('Strategic Roadmap (Quick Actions)')
    results.quick_actions.forEach((action, index) => {
      if (y > 270) {
        doc.addPage()
        y = 25
      }
      const lines = doc.splitTextToSize(`${index + 1}. ${action}`, pageWidth - 40)
      doc.text(lines, 20, y)
      y += (lines.length * 5) + 4
    })
    y += 8
  }

  if (results.interview_tips && results.interview_tips.length > 0) {
    addSection('Expert Interview Strategies')
    results.interview_tips.forEach((tip) => {
      if (y > 270) {
        doc.addPage()
        y = 25
      }
      doc.setFont('helvetica', 'bold')
      doc.text(`\u2022`, 20, y) // Bullet point
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(tip, pageWidth - 50)
      doc.text(lines, 26, y)
      y += (lines.length * 5) + 4
    })
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    
    // Bottom border
    doc.setFillColor(17, 17, 17)
    doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, 'F')
    
    doc.setFontSize(8)
    doc.setTextColor(200, 200, 200)
    doc.text(
      `CONFIDENTIAL | PLACIFY AI ANALYTICAL REPORT | PAGE ${page} OF ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    )
  }

  doc.save(`Placify_AI_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
}

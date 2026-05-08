export const TIER_BADGE = {
  Startup: 'badge-startup',
  'Service-Based': 'badge-service',
  'Product-Based': 'badge-product',
  Fintech: 'badge-fintech',
  'Top-Tier': 'badge-toptier',
}

export const getTierBadgeClass = (tier) => TIER_BADGE[tier] || 'badge-service'

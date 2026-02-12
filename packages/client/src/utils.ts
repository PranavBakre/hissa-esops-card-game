// ===========================================
// ESOP Wars v4 - Utility Functions
// ===========================================

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `₹${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `₹${(value / 1_000_000).toFixed(0)}M`;
  }
  return `₹${value.toLocaleString()}`;
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'Engineering': return 'var(--cat-engineering)';
    case 'Product': return 'var(--cat-product)';
    case 'Sales': return 'var(--cat-sales)';
    case 'Ops': return 'var(--cat-ops)';
    case 'Finance': return 'var(--cat-finance)';
    default: return 'var(--text-muted)';
  }
}

export function getMultiplierClass(multiplier: number): string {
  if (multiplier >= 1.5) return 'high';
  if (multiplier >= 1.0) return 'moderate';
  return 'low';
}

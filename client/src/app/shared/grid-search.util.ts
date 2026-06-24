/** Client-side search across all primitive fields in grid row objects. */
export function filterByGridSearch<T>(items: readonly T[], term: string): T[] {
  const q = normalizeSearchTerm(term);
  if (!q) return [...items];
  return items.filter((item) => objectMatchesSearch(item, q));
}

export function gridEmptyMessage(term: string, defaultMessage: string): string {
  return normalizeSearchTerm(term) ? 'No matches for your search.' : defaultMessage;
}

function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase();
}

function objectMatchesSearch(value: unknown, q: string, depth = 0): boolean {
  if (value == null || depth > 4) return false;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase().includes(q);
  }

  if (value instanceof Date) {
    return value.toLocaleDateString().toLowerCase().includes(q);
  }

  if (Array.isArray(value)) {
    return value.some((v) => objectMatchesSearch(v, q, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) => objectMatchesSearch(v, q, depth + 1));
  }

  return false;
}

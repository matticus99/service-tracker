function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

export function fuzzyMatch(serviceName: string, intervalItemName: string): boolean {
  const a = normalize(serviceName)
  const b = normalize(intervalItemName)
  if (!a || !b) return false
  if (a.includes(b) || b.includes(a)) return true
  const wordsA = a.split(/\s+/)
  const wordsB = new Set(b.split(/\s+/))
  return wordsA.some((w) => w.length >= 3 && wordsB.has(w))
}

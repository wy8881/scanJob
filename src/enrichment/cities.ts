const CITIES = [
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
  'Canberra', 'Darwin', 'Hobart', 'Gold Coast', 'Newcastle',
  'Wollongong', 'Sunshine Coast', 'Geelong', 'Townsville', 'Cairns',
]

const CITY_PATTERN = new RegExp(CITIES.join('|'), 'i')

export function normalizeCity(raw: string): string {
  const match = raw.match(CITY_PATTERN)
  if (match) {
    return CITIES.find(c => c.toLowerCase() === match[0].toLowerCase()) ?? 'Australia'
  }
  return 'Australia'
}

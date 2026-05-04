const CITIES = [
  // Major metros
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
  'Canberra', 'Darwin', 'Hobart',
  // Queensland
  'Gold Coast', 'Sunshine Coast', 'Townsville', 'Cairns', 'Toowoomba',
  'Mackay', 'Rockhampton', 'Bundaberg', 'Hervey Bay', 'Gladstone',
  // NSW
  'Newcastle', 'Wollongong', 'Central Coast', 'Maitland', 'Wagga Wagga',
  'Albury', 'Orange', 'Dubbo', 'Lismore', 'Ballina', 'Port Macquarie',
  // Victoria
  'Geelong', 'Ballarat', 'Bendigo', 'Shepparton', 'Mildura',
  'Wodonga', 'Warrnambool', 'Traralgon',
  // WA
  'Mandurah', 'Bunbury', 'Geraldton', 'Kalgoorlie', 'Albany',
  // SA
  'Mount Gambier', 'Whyalla', 'Murray Bridge',
  // Tasmania
  'Launceston', 'Devonport', 'Burnie',
]

const CITY_PATTERN = new RegExp(CITIES.join('|'), 'i')

export function normalizeCity(raw: string): string {
  const match = raw.match(CITY_PATTERN)
  if (match) {
    return CITIES.find(c => c.toLowerCase() === match[0].toLowerCase()) ?? 'Australia'
  }
  return 'Australia'
}

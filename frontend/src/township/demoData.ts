export type HomeStatus = 'routine' | 'concern' | 'checking' | 'inactivity' | 'away' | 'offline'
export type Plot = { id: string; x: number; z: number; twin: boolean }
export type DemoHome = Plot & {
  street: string; number: string; status: HomeStatus; gap: string; reason: string
}

export const statusLabels: Record<HomeStatus, string> = {
  routine: 'No follow-up', concern: 'Needs follow-up', checking: 'Check accepted',
  inactivity: 'Unusual inactivity', away: 'Declared away', offline: 'Feed unavailable',
}
export const statusColors: Record<HomeStatus, string> = {
  routine: '#b4a99b', concern: '#b05a36', checking: '#b05a36', inactivity: '#e8892e', away: '#b4a99b', offline: '#b4a99b',
}
export const needsAttention = (home: DemoHome) => ['concern', 'checking', 'inactivity'].includes(home.status)
export const attentionStatus = (home: DemoHome) => home.status === 'inactivity' ? 'unusual_inactivity' : needsAttention(home) ? 'unresolved_concern' : 'routine'

// An illustrative massing model, not a surveyed or address-accurate site model.
export const plots: Plot[] = []
const rows = [
  { z: -25, from: -51, count: 26, twin: false },
  { z: -12, from: -47, count: 25, twin: false },
  { z: -5, from: -25, count: 19, twin: false },
  { z: 8, from: -20, count: 10, twin: false },
  { z: 15, from: -14, count: 8, twin: false },
  { z: 28, from: -6, count: 6, twin: false },
  { z: 41, from: -1, count: 21, twin: false },
  { z: 9, from: 24, count: 6, twin: true },
  { z: 30, from: 24, count: 6, twin: true },
]
for (const row of rows) for (let i = 0; i < row.count; i++) {
  const width = row.twin ? 4.5 : 3.35
  plots.push({ id: `plot-${plots.length}`, x: row.from + i * width + Math.floor(i / 6) * 1.6, z: row.z, twin: row.twin })
}

const monitoredIndices = [2, 8, 23, 21, 27, 32, 39, 45, 52, 57, 63, 68, 72, 76, 81, 86, 91, 94, 98, 103, 110, 116, 121, 125]
export const initialHomes: DemoHome[] = monitoredIndices.map((index, i) => {
  const status: HomeStatus = i === 17 ? 'concern' : i === 6 ? 'checking' : i === 2 ? 'inactivity' : i === 21 ? 'offline' : i === 10 || i === 23 ? 'away' : 'routine'
  return {
    ...plots[index], id: `IR3-${String(i + 1).padStart(3, '0')}`,
    street: `Jalan Elmina Ilham ${[18, 19, 20, 21, 22, 23][Math.min(5, Math.floor(i / 4))]}`,
    number: String(2 + (i % 4) * 6), status,
    gap: status === 'concern' ? '4 h 20 min' : status === 'checking' ? '3 h 35 min' : status === 'inactivity' ? '2 h 45 min' : '',
    reason: status === 'concern' ? 'No new household activity after the usual morning window. Resident verification call was unanswered.'
      : status === 'checking' ? 'No response to the resident verification call. A township operator has accepted the check.'
      : status === 'inactivity' ? 'TemanMu noticed a break in the resident’s routine and is calling the resident first.'
      : status === 'offline' ? 'Both utility feeds stopped at 10:22 MYT. Activity cannot be assessed from missing readings.'
      : status === 'away' ? 'Family declared the resident away until 12 Nov. Inactivity follow-up is paused during this period.'
      : 'Recent utility changes match this sample household’s usual morning pattern.',
  }
})

export const officialSite = 'https://www.simedarbyproperty.com/city-of-elmina/ilham-residence-3/'
export const officialBrochure = 'https://simedarbyproperty.com/city-of-elmina/ilham-residence-3/brochure/Main%20Brochure.pdf?v2='

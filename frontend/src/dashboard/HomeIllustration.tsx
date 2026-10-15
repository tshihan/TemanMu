import type { Status } from '../api/types'

const palette: Record<Status, { roof: string; wall: string; door: string; glow: string }> = {
  routine: { roof: '#528d77', wall: '#e3efe6', door: '#39735d', glow: '#a5d8ae' },
  possible_away: { roof: '#8a9b99', wall: '#e9efed', door: '#71817e', glow: '#d1dbd7' },
  unusual_inactivity: { roof: '#bd8d42', wall: '#f8ecd4', door: '#9a7137', glow: '#f1d08c' },
  unresolved_concern: { roof: '#b65d53', wall: '#f8e6df', door: '#9d4b43', glow: '#efaaa0' },
}

export function HomeIllustration({ status, unitId }: { status: Status; unitId: string }) {
  const colors = palette[status]
  return <svg className="home-art" viewBox="0 0 260 150" aria-hidden="true" focusable="false">
    <ellipse cx="132" cy="137" rx="105" ry="9" fill="#244d3d" opacity=".09" />
    <path d="M37 75 126 19 224 75v8H37z" fill={colors.roof} />
    <path d="m126 19 98 56h-21l-77-43L56 75H37z" fill="#fff" opacity=".19" />
    <path d="M52 76h157v61H52z" fill={colors.wall} />
    <path d="M52 76h157v6H52z" fill="#214834" opacity=".12" />
    <rect x="73" y="89" width="35" height="29" rx="3" fill="#fff" />
    <rect x="77" y="93" width="27" height="21" rx="2" fill={colors.glow} />
    <path d="M90.5 93v21M77 103.5h27" stroke="#fff" strokeWidth="3" />
    <rect x="153" y="89" width="35" height="29" rx="3" fill="#fff" />
    <rect x="157" y="93" width="27" height="21" rx="2" fill={colors.glow} />
    <path d="M170.5 93v21M157 103.5h27" stroke="#fff" strokeWidth="3" />
    <path d="M116 98a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5v39h-28z" fill={colors.door} />
    <circle cx="137" cy="118" r="2" fill="#f7e5b3" />
    <rect x="119" y="82" width="22" height="8" rx="2" fill="#fff" opacity=".93" />
    <text x="130" y="88" textAnchor="middle" fill="#516357" fontSize="6" fontWeight="700">{unitId}</text>
    <path d="M39 135h184" stroke="#bed0c2" strokeWidth="3" strokeLinecap="round" />
    <path d="M44 135v-17M44 129c-9-4-11-12-5-18 5 1 8 4 9 9 5-8 11-8 15-5-1 7-5 11-14 14" stroke="#769f78" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M216 135v-16M216 128c-8-4-11-10-7-15 5 0 8 3 9 8 4-6 9-7 13-4-2 6-6 9-12 11" stroke="#769f78" strokeWidth="4" strokeLinecap="round" fill="none" />
  </svg>
}

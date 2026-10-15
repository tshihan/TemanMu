import type { Status } from '../api/types'

export function HomeIllustration({ status, unitId }: { status: Status; unitId: string }) {
  const lightState = status === 'possible_away' ? 'away' : status === 'routine' ? 'on' : 'alert'

  return <svg className={`home-art home-art-${lightState}`} viewBox="0 0 300 180" aria-hidden="true" focusable="false">
    <ellipse cx="151" cy="163" rx="125" ry="10" fill="#57453c" opacity=".2" />
    <path d="M36 151q0-5 5-5h219q5 0 5 5v10q0 5-5 5H41q-5 0-5-5z" fill="#c6ad8f" />
    <path d="M42 150h216v10H42z" fill="#9bbd70" />

    <path d="M66 82 132 25l69 57v68H66z" fill="#fff0d6" />
    <path d="M201 82 250 69v73l-49 8z" fill="#dfb995" />
    <path d="M66 82 132 25l69 57" fill="none" stroke="#c5916d" strokeWidth="3" />
    <path d="M52 84 124 18q8-7 16 0l73 66q3 3 0 7t-7 1l-74-61-73 61q-4 3-7-1t0-7z" fill="#bc5540" />
    <path d="M132 17 176 24 262 69q5 3 2 8t-8 4L206 91z" fill="#e77b52" />
    <path d="M138 25 176 30 253 71 207 82z" fill="#f28b5f" />
    <path d="m149 29 57 50m-34-46 55 43m-33-38 55 37" stroke="#c95f44" strokeWidth="3" opacity=".6" />
    <path d="m159 55 53 1m-38 12 61 1" stroke="#f8ae77" strokeWidth="2" opacity=".65" />
    <path d="M54 88 132 21l76 67" fill="none" stroke="#f08b63" strokeWidth="5" strokeLinecap="round" />

    <rect x="107" y="57" width="48" height="25" rx="5" fill="#9a6a4b" />
    <rect x="112" y="61" width="38" height="18" rx="2" fill="#304e63" />
    <g className="interior-light">
      <rect x="112" y="61" width="38" height="18" rx="2" fill="#ffd36c" />
    </g>
    <path d="M131 61v18m-19-9h38" stroke="#9a6a4b" strokeWidth="3" />
    <path d="M105 83h52" stroke="#a96f48" strokeWidth="4" strokeLinecap="round" />

    <rect x="78" y="94" width="105" height="52" rx="6" fill="#a76d47" />
    <rect x="84" y="99" width="93" height="42" rx="3" fill="#294861" />
    <g className="interior-light">
      <rect x="84" y="99" width="93" height="42" rx="3" fill="#ffd170" />
      <ellipse cx="153" cy="118" rx="22" ry="21" fill="#fff3b3" opacity=".7" />
    </g>
    <path d="M89 136q0-9 10-9h21q8 0 9 9" fill="#8d6e5d" />
    <path d="M95 127v-8m-5 0q4-11 9 0" stroke="#6d8b5d" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M129 137q0-12 10-12h19q9 0 9 12" fill="#ba8564" />
    <path d="M153 99v12" stroke="#80563c" strokeWidth="2" />
    <path d="M140 116q3-12 13-12t13 12z" fill="#a65f38" />
    <circle cx="153" cy="122" r="7" fill="#7d7970" />
    <g className="interior-light">
      <circle cx="153" cy="122" r="12" fill="#fff5c2" opacity=".4" />
      <circle cx="153" cy="122" r="7" fill="#fffdf1" />
    </g>
    <path d="M128 99v42m-44-42v42" stroke="#a76d47" strokeWidth="5" />
    <path d="M78 94h105m-105 51h105" stroke="#8c5839" strokeWidth="5" strokeLinecap="round" />

    <path d="M207 91 250 79v13l-43 12z" fill="#ca623f" />
    <path d="M213 106 242 98v48l-29 5z" fill="#8f5838" />
    <path d="M218 108 238 102v44l-20 3z" fill="#ae7042" />
    <path d="M221 107v42m7-44v43" stroke="#855032" strokeWidth="2" />
    <circle cx="235" cy="126" r="2" fill="#efc680" />
    <path d="M205 151h48l-11 8h-46z" fill="#ead0aa" />

    <circle cx="61" cy="145" r="11" fill="#88a95f" />
    <circle cx="255" cy="145" r="10" fill="#739a5a" />
    <rect x="184" y="122" width="19" height="9" rx="3" fill="#fff1da" />
    <text x="193.5" y="129" textAnchor="middle" fill="#654d3f" fontSize="6" fontWeight="700">{unitId}</text>
  </svg>
}

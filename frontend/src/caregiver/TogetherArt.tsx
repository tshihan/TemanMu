// Illustrations for the Together postcards. Shapes only, coloured by theme tokens so both themes work.

/** A sun rising over three sprouts: something happening outdoors this week. */
export function OutingArt() {
  return <svg className="cg-art" viewBox="96 28 100 100" aria-hidden="true">
    <circle className="cg-art-ring" cx="226" cy="128" r="104" />
    <circle className="cg-art-ring" cx="226" cy="128" r="78" />
    <circle className="cg-art-sun" cx="226" cy="128" r="52" />
    {[66, 104, 142].map((x, index) => <g key={x} className="cg-art-sprout" style={{ animationDelay: `${index * 120 + 200}ms` }}>
      <path d={`M${x} 128 V${92 - index * 6}`} />
      <path className="cg-art-leaf" d={`M${x} ${102 - index * 6} q-16 -2 -20 -18 q16 0 20 18 Z`} />
      <path className="cg-art-leaf" d={`M${x} ${110 - index * 6} q16 -2 20 -18 q-16 0 -20 18 Z`} />
    </g>)}
  </svg>
}

/** Two figures side by side, leaning in: a buddy who shares an interest. */
export function BuddyArt() {
  return <svg className="cg-art" viewBox="104 28 112 112" aria-hidden="true">
    <circle className="cg-art-ring" cx="160" cy="128" r="96" />
    <g className="cg-art-person is-a">
      <circle cx="134" cy="62" r="20" />
      <path d="M96 128 q38 -60 76 0 Z" />
    </g>
    <g className="cg-art-person is-b">
      <circle cx="190" cy="68" r="17" />
      <path d="M158 128 q32 -52 64 0 Z" />
    </g>
    <path className="cg-art-heart" d="M162 34 c-5 -7 -15 -3 -12 5 c2 5 12 11 12 11 s10 -6 12 -11 c3 -8 -7 -12 -12 -5 Z" />
  </svg>
}

/** An apartment block where two homes on different floors light up at the same hour. */
export function NeighbourArt() {
  const lit = new Set(['0-1', '2-3'])
  return <svg className="cg-art" viewBox="96 18 110 110" aria-hidden="true">
    <circle className="cg-art-dawn" cx="276" cy="34" r="13" />
    <rect className="cg-art-block" x="70" y="18" width="180" height="110" rx="8" />
    {[0, 1, 2].map(row => [0, 1, 2, 3, 4].map(col => {
      const on = lit.has(`${row}-${col}`)
      return <rect key={`${row}-${col}`} className={`cg-art-window ${on ? 'is-lit' : ''}`} x={86 + col * 32} y={32 + row * 30} width="20" height="16" rx="3"
        style={on ? { animationDelay: `${row === 0 ? 400 : 700}ms` } : undefined} />
    }))}
  </svg>
}

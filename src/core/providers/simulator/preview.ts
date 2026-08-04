/**
 * Generates a lightweight SVG "screenshot" of the simulated build so the
 * Screenshot History panel has something real to show. Purely cosmetic —
 * real providers will attach genuine captures.
 */
export function buildPreviewSvg(title: string, variant: 'first-pass' | 'rework'): string {
  const accent = variant === 'rework' ? '#8b5cf6' : '#6366f1'
  const footerFill = variant === 'rework' ? '#1c1c22' : '#101014'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0a0a0c"/>
  <rect x="48" y="32" width="120" height="14" rx="7" fill="#2a2a32"/>
  <rect x="1064" y="26" width="88" height="26" rx="13" fill="${accent}"/>
  <rect x="944" y="32" width="88" height="14" rx="7" fill="#2a2a32"/>
  <!-- hero -->
  <rect x="48" y="120" width="520" height="44" rx="8" fill="#e8e8ec"/>
  <rect x="48" y="176" width="440" height="44" rx="8" fill="#e8e8ec"/>
  <rect x="48" y="248" width="360" height="16" rx="8" fill="#55555f"/>
  <rect x="48" y="300" width="140" height="40" rx="20" fill="${accent}"/>
  <rect x="660" y="104" width="572" height="280" rx="16" fill="#16161c" stroke="#26262e"/>
  <rect x="700" y="144" width="492" height="200" rx="8" fill="#1e1e26"/>
  <!-- features -->
  <rect x="48" y="440" width="368" height="140" rx="12" fill="#111116" stroke="#222229"/>
  <rect x="456" y="440" width="368" height="140" rx="12" fill="#111116" stroke="#222229"/>
  <rect x="864" y="440" width="368" height="140" rx="12" fill="#111116" stroke="#222229"/>
  <circle cx="88" cy="484" r="14" fill="${accent}"/>
  <circle cx="496" cy="484" r="14" fill="${accent}"/>
  <circle cx="904" cy="484" r="14" fill="${accent}"/>
  <!-- footer -->
  <rect x="0" y="628" width="1280" height="92" fill="${footerFill}"/>
  ${variant === 'rework' ? `<rect x="0" y="624" width="1280" height="4" fill="${accent}"/>` : ''}
  <rect x="48" y="660" width="180" height="12" rx="6" fill="#3a3a44"/>
  <rect x="1100" y="660" width="132" height="12" rx="6" fill="#3a3a44"/>
  <text x="640" y="700" font-family="monospace" font-size="11" fill="#44444e" text-anchor="middle">${escapeXml(title)} — simulated preview (${variant})</text>
</svg>`
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

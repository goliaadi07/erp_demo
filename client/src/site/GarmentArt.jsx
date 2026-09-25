import React from 'react';

// Lightweight SVG placeholders used until real product photos are uploaded.
const SHAPES = {
  shirt: (
    <>
      <path d="M38 16 L46 13 L50 21 L54 13 L62 16 L80 26 L86 64 L76 66 L70 42 L70 88 L30 88 L30 42 L24 66 L14 64 L20 26 Z" />
      <path className="ga-line" d="M50 21 L50 88 M46 13 L42 24 L50 21 L58 24 L54 13" />
      <circle className="ga-dot" cx="50" cy="36" r="1.6" /><circle className="ga-dot" cx="50" cy="50" r="1.6" /><circle className="ga-dot" cx="50" cy="64" r="1.6" />
    </>
  ),
  halfhastin: (
    <>
      <path d="M38 18 Q50 27 62 18 L82 28 L76 45 L68 41 L68 86 L32 86 L32 41 L24 45 L18 28 Z" />
      <path className="ga-line" d="M40 20 Q50 30 60 20" />
    </>
  ),
  pant: (
    <>
      <path d="M31 14 L69 14 L73 88 L56 88 L50 38 L44 88 L27 88 Z" />
      <path className="ga-line" d="M31 21 L69 21 M50 21 L50 38 M38 21 L37 30 M62 21 L63 30" />
    </>
  ),
  skirt: (
    <>
      <path d="M35 20 L65 20 L79 82 L21 82 Z" />
      <path className="ga-line" d="M35 27 L65 27 M42 27 L36 82 M50 27 L50 82 M58 27 L64 82" />
    </>
  ),
  pinaco: (
    <>
      <path d="M39 13 L44 13 L46 33 L54 33 L56 13 L61 13 L63 38 L77 86 L23 86 L37 38 Z" />
      <path className="ga-line" d="M37 44 L63 44 M44 52 L56 52" />
    </>
  ),
  grammer: (
    <>
      <path d="M37 11 L42 11 L42 30 L58 30 L58 11 L63 11 L63 47 L67 88 L53 88 L50 59 L47 88 L33 88 L37 47 Z" />
      <path className="ga-line" d="M42 38 L58 38 M37 47 L63 47" />
    </>
  ),
  bandi: (
    <>
      <path d="M36 16 L44 14 L50 42 L56 14 L64 16 L66 30 Q72 34 72 42 L72 86 L28 86 L28 42 Q28 34 34 30 Z" />
      <path className="ga-line" d="M50 42 L50 86 M34 60 L42 60 M58 60 L66 60" />
      <circle className="ga-dot" cx="50" cy="52" r="1.6" /><circle className="ga-dot" cx="50" cy="64" r="1.6" /><circle className="ga-dot" cx="50" cy="76" r="1.6" />
    </>
  ),
  default: (
    <>
      <path className="ga-line" d="M50 22 a6 6 0 1 1 6 6 Q50 30 50 36 L16 62 Q12 66 18 66 L82 66 Q88 66 84 62 L50 36" />
    </>
  ),
};

const PALETTES = {
  'School Uniform': ['#26345f', '#4b5d8f'],
  'Kids Wear': ['#a8582f', '#d19a5b'],
  'Ethnic & Occasion': ['#5b2333', '#9a6b2f'],
};

export function paletteFor(category) {
  return PALETTES[category] || ['#3a3631', '#6b645b'];
}

export default function GarmentArt({ product, className = '' }) {
  const [a, b] = paletteFor(product && product.category);
  if (product && product.imageUrl) {
    return <img className={`garment-img ${className}`} src={product.imageUrl} alt={product.name} loading="lazy" />;
  }
  const shape = SHAPES[product && product.id] || SHAPES.default;
  return (
    <div className={`garment-art ${className}`} style={{ '--ga-a': a, '--ga-b': b }} role="img" aria-label={product ? `${product.name} illustration` : 'Garment illustration'}>
      <svg viewBox="0 0 100 100" aria-hidden="true">{shape}</svg>
    </div>
  );
}

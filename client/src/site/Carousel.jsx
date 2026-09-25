import React, { useCallback, useEffect, useRef, useState } from 'react';
import GarmentArt, { paletteFor } from './GarmentArt.jsx';

const INTERVAL_MS = 5500;

export default function Carousel({ slides, onOpen }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const count = slides.length;

  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (paused || count < 2) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, paused, count]);

  if (!count) return null;

  return (
    <section
      className="carousel"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        touchX.current = null;
      }}
    >
      <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => {
          const [a, b] = paletteFor(s.product && s.product.category);
          return (
            <div
              key={s.key}
              className="slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== index}
              style={{ '--slide-a': a, '--slide-b': b }}
            >
              <div className="slide-copy">
                <span className="slide-eyebrow">{s.eyebrow}</span>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
                {s.product ? (
                  <button type="button" className="btn btn-light" tabIndex={i === index ? 0 : -1} onClick={() => onOpen(s.product)}>
                    View {s.product.name}
                  </button>
                ) : (
                  <a className="btn btn-light" href="#quote" tabIndex={i === index ? 0 : -1}>Request a quote</a>
                )}
              </div>
              <div className="slide-art">
                <GarmentArt product={s.product || { id: 'default', category: '' }} />
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" className="carousel-arrow prev" onClick={prev} aria-label="Previous slide">‹</button>
      <button type="button" className="carousel-arrow next" onClick={next} aria-label="Next slide">›</button>
      <div className="carousel-dots" role="tablist" aria-label="Choose slide">
        {slides.map((s, i) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            className={`dot${i === index ? ' active' : ''}`}
            aria-selected={i === index}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}

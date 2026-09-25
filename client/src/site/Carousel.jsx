import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from './i18n.js';

const INTERVAL_MS = 6000;

// Full-width editorial hero: cross-fade slides, arrows, numbered progress dots,
// autoplay that pauses on hover/focus (and when the tab is hidden), swipe on touch.
export default function Carousel({ slides, onAction }) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const count = slides.length;
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (paused || count < 2) return undefined;
    const t = setTimeout(() => { if (!document.hidden) setIndex((i) => (i + 1) % count); }, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, paused, count]);

  if (!count) return null;
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <section
      className={`hero${paused ? ' is-paused' : ''}${reduced ? ' no-motion' : ''}`}
      aria-roledescription="carousel"
      aria-label={t('Featured collections')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        touchX.current = null;
      }}
    >
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={s.key}
            className={`hero-slide${active ? ' active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={t('{n} of {count}: {title}', { n: i + 1, count, title: s.title })}
            aria-hidden={!active}
          >
            <img
              className="hero-img"
              src={s.image}
              alt={s.alt}
              width="1600"
              height="900"
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              decoding="async"
              style={s.focus ? { objectPosition: s.focus } : undefined}
            />
            <div className="hero-shade" aria-hidden="true" />
            <div className="hero-copy container">
              <span className="eyebrow eyebrow-light">{s.eyebrow}</span>
              <h1 className="hero-title">{s.title}</h1>
              <p className="hero-text">{s.text}</p>
              <div className="hero-actions">
                <button type="button" className="btn btn-ivory" tabIndex={active ? 0 : -1} onClick={() => onAction(s.primary.action)}>
                  {s.primary.label}
                </button>
                {s.secondary && (
                  <button type="button" className="btn btn-outline-light" tabIndex={active ? 0 : -1} onClick={() => onAction(s.secondary.action)}>
                    {s.secondary.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="hero-controls container">
        <div className="hero-dots" role="tablist" aria-label={t('Choose slide')}>
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              className={`hero-dot${i === index ? ' active' : ''}`}
              aria-selected={i === index}
              aria-label={t('Slide {n}: {title}', { n: i + 1, title: s.title })}
              onClick={() => go(i)}
            >
              <span className="hero-dot-num">{pad(i + 1)}</span>
              <span className="hero-dot-bar"><span key={i === index ? `a${index}` : 'i'} className="hero-dot-fill" style={{ animationDuration: `${INTERVAL_MS}ms` }} /></span>
            </button>
          ))}
        </div>
        <div className="hero-arrows">
          <button type="button" className="hero-arrow" onClick={prev} aria-label={t('Previous slide')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" className="hero-arrow" onClick={next} aria-label={t('Next slide')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

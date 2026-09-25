import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Carousel from './Carousel.jsx';
import GarmentArt from './GarmentArt.jsx';
import QuoteForm from './QuoteForm.jsx';
import { IconArrow, IconBack, IconBoxes, IconClose, IconFabric, IconMenu, IconSearch, IconTape, IconTruck } from './Icons.jsx';
import './site.css';

const HERO_SLIDES = [
  {
    key: 'collection', image: '/images/hero-collection.webp', alt: 'Garments on rails in a bright clothing studio',
    eyebrow: 'The Uniform Collection', title: 'Dressed for every school day',
    text: 'Shirts, trousers, skirts and pinafores cut from hard-wearing fabrics and finished to last the whole year.',
    primary: { label: 'View collection', action: 'collection' }, secondary: { label: 'Request a quote', action: 'quote' },
  },
  {
    key: 'tailoring', image: '/images/hero-tailoring.webp', alt: 'A tailor cutting dark suiting fabric beside a measuring tape',
    eyebrow: 'Tailored to measure', title: 'Your colours. Your crest. Your fit.',
    text: 'Custom sizing charts, embroidery and trims made to match your institution.',
    primary: { label: 'Request a quote', action: 'quote' }, secondary: { label: 'Why CRB', action: 'about' },
  },
  {
    key: 'fabrics', image: '/images/hero-fabrics.webp', alt: 'Rolls of colourful fabric stacked on shelves',
    eyebrow: 'Fabric first', title: 'Chosen for comfort, built for wear',
    text: 'Poly-cotton, terry-wool and twill blends selected for colour-fastness and easy care.',
    primary: { label: 'View collection', action: 'collection' },
  },
  {
    key: 'kids', image: '/images/hero-kidswear.webp', alt: 'Bright children’s dresses hanging on a rail',
    eyebrow: 'Kids wear', title: 'Soft, easy wear for little learners',
    text: 'Pinafores and grammers designed for comfort, quick dressing and busy school days.',
    primary: { label: 'Shop kids wear', action: 'kids' }, secondary: { label: 'Request a quote', action: 'quote' },
  },
  {
    key: 'production', image: '/images/hero-production.webp', alt: 'Hands guiding striped fabric through an industrial sewing machine',
    eyebrow: 'Made in our own unit', title: 'Bulk orders, delivered on time',
    text: 'From cutting to packing under one roof — consistent quality across every size and every batch.',
    primary: { label: 'Request a quote', action: 'quote' },
  },
];

const WHY = [
  { Icon: IconFabric, title: 'Fabric quality', text: 'Carefully sourced, colour-fast fabrics that keep their shape wash after wash.' },
  { Icon: IconTape, title: 'Custom sizing', text: 'Size charts from pre-primary to adult, with made-to-measure options.' },
  { Icon: IconBoxes, title: 'Bulk orders', text: 'Consistent quality across hundreds of pieces for schools and institutions.' },
  { Icon: IconTruck, title: 'On-time delivery', text: 'Planned production so your uniforms are ready before the term begins.' },
];

function formatPrice(p) {
  if (p == null) return null;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);
  } catch { return `₹${p}`; }
}

function productIdFromPath(pathname) {
  const m = /^\/product\/([^/]+)\/?$/.exec(pathname);
  return m ? decodeURIComponent(m[1]) : null;
}

function matches(product, q) {
  if (!q) return true;
  const hay = `${product.name} ${product.category} ${product.description} ${product.details} ${product.tagline}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

function splitSizes(sizes) {
  return String(sizes || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

function ProductImage({ product, className = '', eager = false, second = false, sizes = '(max-width: 640px) 50vw, 25vw' }) {
  const src = second ? product.imageUrl2 : product.imageUrl;
  if (!src) return <GarmentArt product={product} className={className} />;
  return (
    <img
      className={className}
      src={src}
      alt={second ? '' : product.imageAlt || product.name}
      width="800"
      height="1000"
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

/* ---------------- Header ---------------- */
function Header({ query, setQuery, onNav, onHome }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const nav = (id) => (e) => { e.preventDefault(); setMenuOpen(false); onNav(id); };
  return (
    <>
      <a className="skip-link" href="#collection" onClick={nav('collection')}>Skip to collection</a>
      <div className="announce">
        <span>School &amp; institutional uniforms made to order</span>
        <span className="announce-sep" aria-hidden="true">·</span>
        <a href="#quote" onClick={nav('quote')}>Request a quote <IconArrow width="14" height="14" /></a>
      </div>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="container header-inner">
          <a className="wordmark" href="/" onClick={(e) => { e.preventDefault(); setMenuOpen(false); onHome(); }} aria-label="CRB Uniforms — home">
            <span className="wordmark-main">CRB</span>
            <span className="wordmark-sub">Uniforms &amp; Garments</span>
          </a>
          <nav className={`main-nav${menuOpen ? ' open' : ''}`} aria-label="Main">
            <a href="#collection" onClick={nav('collection')}>Collection</a>
            <a href="#about" onClick={nav('about')}>About</a>
            <a href="#quote" onClick={nav('quote')}>Request a Quote</a>
          </nav>
          <form className="header-search" role="search" onSubmit={(e) => { e.preventDefault(); onNav('collection'); }}>
            <IconSearch className="header-search-icon" width="18" height="18" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shirts, skirts, kids wear…"
              aria-label="Search products"
            />
            {query && (
              <button type="button" className="icon-btn search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <IconClose width="16" height="16" />
              </button>
            )}
          </form>
          <button
            type="button"
            className="icon-btn menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <IconClose width="22" height="22" /> : <IconMenu width="22" height="22" />}
          </button>
        </div>
      </header>
    </>
  );
}

/* ---------------- Product card ---------------- */
function ProductCard({ product, index, onOpen }) {
  const price = formatPrice(product.price);
  const href = `/product/${encodeURIComponent(product.id)}`;
  return (
    <article className="card" style={{ '--i': index }}>
      <a className="card-media" href={href} onClick={(e) => { e.preventDefault(); onOpen(product); }} aria-label={`View ${product.name}`}>
        <ProductImage product={product} className="card-img card-img-main" eager={index < 2} />
        {product.imageUrl2 && <ProductImage product={product} className="card-img card-img-alt" second />}
        <span className="card-tag">{product.category}</span>
      </a>
      <div className="card-body">
        <h3 className="card-title">
          <a href={href} onClick={(e) => { e.preventDefault(); onOpen(product); }}>{product.name}</a>
        </h3>
        <p className="card-line">{product.tagline || product.description}</p>
        <div className="card-foot">
          <span className={price ? 'card-price' : 'card-price muted'}>{price || 'Price on request'}</span>
          <button type="button" className="card-quote" onClick={() => onOpen(product, { focusQuote: true })}>
            Request quote
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------------- Home ---------------- */
function Home({ products, loading, loadError, query, setQuery, category, setCategory, onOpen, onHeroAction, presetProduct }) {
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const filtered = useMemo(
    () => products.filter((p) => (category === 'All' || p.category === category) && matches(p, query.trim())),
    [products, query, category]
  );
  const searching = !!query.trim();

  return (
    <main id="main">
      {!searching && <Carousel slides={HERO_SLIDES} onAction={onHeroAction} />}

      <section className="section collection" id="collection" aria-labelledby="collection-title">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">{searching ? 'Search' : 'Shop the range'}</span>
              <h2 id="collection-title" className="section-title">{searching ? `Results for “${query.trim()}”` : 'The Collection'}</h2>
            </div>
            <p className="section-lede">
              Every piece is cut and stitched in our own unit. Choose a style to see sizes and request a quote.
            </p>
          </div>

          <div className="toolbar">
            <div className="chips" role="group" aria-label="Filter by category">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${category === c ? ' active' : ''}`}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                  {c !== 'All' && <span className="chip-count">{products.filter((p) => p.category === c).length}</span>}
                </button>
              ))}
            </div>
            <div className="toolbar-search">
              <IconSearch width="16" height="16" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the collection"
                aria-label="Search the collection"
              />
            </div>
          </div>

          <p className="result-count" aria-live="polite">
            {loading ? 'Loading the collection…' : `${filtered.length} ${filtered.length === 1 ? 'style' : 'styles'}${category !== 'All' ? ` in ${category}` : ''}${searching ? ` matching “${query.trim()}”` : ''}`}
          </p>

          {loadError && <div className="qf-alert" role="alert">{loadError}. Please refresh the page.</div>}
          {loading ? (
            <div className="grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card skeleton" aria-hidden="true" />)}</div>
          ) : filtered.length ? (
            <div className="grid">{filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} onOpen={onOpen} />)}</div>
          ) : (
            <div className="empty">
              <p>Nothing matches your search just yet.</p>
              <button type="button" className="btn btn-ghost" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button>
            </div>
          )}
        </div>
      </section>

      <section className="section why" id="about" aria-labelledby="about-title">
        <div className="container">
          <div className="about">
            <div className="about-copy" data-reveal>
              <span className="eyebrow">About CRB</span>
              <h2 id="about-title" className="section-title">Craftsmanship in every stitch</h2>
              <p>
                We are a uniform and garment manufacturer. Cutting, stitching, buttons, ironing and packing all happen in our own
                production unit, so every order is made with the same care — whether it is one class or a whole school.
              </p>
              <a className="link-arrow" href="#quote" onClick={(e) => { e.preventDefault(); onHeroAction('quote'); }}>
                Talk to us about your order <IconArrow width="16" height="16" />
              </a>
            </div>
            <figure className="about-figure" data-reveal>
              <img src="/images/hero-tailoring.webp" alt="Tailor measuring and cutting fabric" width="1600" height="900" loading="lazy" decoding="async" />
            </figure>
          </div>
          <ul className="why-grid" aria-label="Why choose us">
            {WHY.map(({ Icon, title, text }) => (
              <li key={title} className="why-item" data-reveal>
                <span className="why-icon"><Icon width="28" height="28" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <QuoteSection products={products} presetProduct={presetProduct} />
    </main>
  );
}

function QuoteSection({ products, presetProduct }) {
  return (
    <section className="section quote" id="quote" aria-labelledby="quote-title">
      <div className="container">
      <div className="quote-wrap">
        <div className="quote-aside" data-reveal>
          <span className="eyebrow eyebrow-light">Request a quote</span>
          <h2 id="quote-title" className="section-title">Let’s make your next uniform order</h2>
          <p>Tell us which style you’re interested in and how to reach you. We’ll reply with pricing, fabric options and delivery timelines.</p>
          <ol className="steps">
            <li><span>01</span><div><b>Share your details</b><br />Takes less than a minute.</div></li>
            <li><span>02</span><div><b>We get in touch</b><br />By phone or email to understand your needs.</div></li>
            <li><span>03</span><div><b>Samples &amp; pricing</b><br />Fabric swatches, sizes and a clear quote.</div></li>
          </ol>
        </div>
        <div className="quote-card" data-reveal>
          <QuoteForm products={products} title="Your details" intro="All fields are required." variant="premium" presetProductId={presetProduct} />
        </div>
      </div>
      </div>
    </section>
  );
}

/* ---------------- Product page ---------------- */
function ProductPage({ product, products, loading, onBack, onOpen, focusQuote }) {
  const formRef = useRef(null);
  const quoteRef = useRef(null);
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [product && product.id]);
  useEffect(() => {
    if (product && focusQuote && quoteRef.current) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      quoteRef.current.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => formRef.current && formRef.current.focus(), reduce ? 0 : 400);
    }
  }, [product && product.id, focusQuote]);

  if (!product) {
    return (
      <main id="main" className="section">
        <div className="container pdp-missing">
          <h1 className="section-title">{loading ? 'Loading…' : 'Product not found'}</h1>
          {!loading && <p>This style may no longer be available.</p>}
          {!loading && <button type="button" className="btn btn-primary" onClick={() => onBack('collection')}>Browse the collection</button>}
        </div>
      </main>
    );
  }

  const images = [product.imageUrl, product.imageUrl2].filter(Boolean);
  const sizes = splitSizes(product.sizes);
  const price = formatPrice(product.price);
  const related = products.filter((p) => p.id !== product.id)
    .sort((a, b) => (b.category === product.category) - (a.category === product.category))
    .slice(0, 4);

  return (
    <main id="main" className="pdp">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <button type="button" className="crumb-back" onClick={() => onBack('collection')}><IconBack width="16" height="16" /> Back</button>
          <ol>
            <li><a href="/" onClick={(e) => { e.preventDefault(); onBack(); }}>Home</a></li>
            <li><a href="/#collection" onClick={(e) => { e.preventDefault(); onBack('collection'); }}>{product.category}</a></li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>

        <div className="pdp-grid">
          <div className="pdp-gallery">
            <div className="pdp-main">
              {images.length ? (
                <img key={images[active]} src={images[active]} alt={active === 0 ? product.imageAlt : `${product.name} — alternate view`} width="800" height="1000" decoding="async" />
              ) : (
                <GarmentArt product={product} />
              )}
            </div>
            {images.length > 1 && (
              <div className="pdp-thumbs" role="group" aria-label="Choose image">
                {images.map((src, i) => (
                  <button key={src} type="button" className={`pdp-thumb${i === active ? ' active' : ''}`} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-pressed={i === active}>
                    <img src={src} alt="" width="160" height="200" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <div className="pdp-story">
              <h2>About this style</h2>
              <p>{product.description}</p>
              {product.details && <p>{product.details}</p>}
              <dl className="pdp-specs">
                <div><dt>Category</dt><dd>{product.category}</dd></div>
                <div><dt>Product code</dt><dd>{product.id.toUpperCase()}</dd></div>
                <div><dt>Customisation</dt><dd>Colours, crest &amp; embroidery on request</dd></div>
              </dl>
            </div>
          </div>

          <aside className="pdp-panel" aria-labelledby="pdp-title">
            <div className="pdp-sticky">
              <span className="eyebrow">{product.category}</span>
              <h1 id="pdp-title" className="pdp-title">{product.name}</h1>
              {product.tagline && <p className="pdp-tagline">{product.tagline}</p>}
              <p className="pdp-price">{price || 'Price on request'}</p>
              {sizes.length > 0 && (
                <div className="pdp-sizes">
                  <div className="pdp-sizes-head">
                    <span>Available sizes</span>
                    {product.sizeNote && <span className="muted">{product.sizeNote}</span>}
                  </div>
                  <ul className="size-chips" aria-label="Available sizes">
                    {sizes.map((s) => <li key={s} className="size-chip">{s}</li>)}
                  </ul>
                </div>
              )}
              <div className="pdp-quote" ref={quoteRef} id="product-quote">
                <QuoteForm
                  ref={formRef}
                  key={product.id}
                  products={products}
                  fixedProduct={product}
                  title={`Request a quote for ${product.name}`}
                  intro="We’ll reply with pricing, fabric options and availability."
                  variant="compact"
                />
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="related" aria-labelledby="related-title">
            <h2 id="related-title" className="section-title small">You may also like</h2>
            <div className="grid">{related.map((p, i) => <ProductCard key={p.id} product={p} index={i} onOpen={onOpen} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}

/* ---------------- Footer ---------------- */
function Footer({ onNav, onCategory, categories }) {
  const nav = (id) => (e) => { e.preventDefault(); onNav(id); };
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <span className="wordmark wordmark-light"><span className="wordmark-main">CRB</span><span className="wordmark-sub">Uniforms &amp; Garments</span></span>
          <p>School uniforms, kids wear and occasion garments — made to order in our own production unit.</p>
        </div>
        <div>
          <h3>Collection</h3>
          <ul>
            {categories.map((c) => (
              <li key={c}><a href="#collection" onClick={(e) => { e.preventDefault(); onCategory(c); }}>{c}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Company</h3>
          <ul>
            <li><a href="#about" onClick={nav('about')}>About us</a></li>
            <li><a href="#quote" onClick={nav('quote')}>Request a quote</a></li>
          </ul>
        </div>
        <div>
          <h3>Contact <span className="placeholder-tag">Placeholder</span></h3>
          <ul className="contact-list">
            <li><span className="muted-light">Phone:</span> +91 XXXXX XXXXX <em>(placeholder)</em></li>
            <li><span className="muted-light">Email:</span> hello@example.com <em>(placeholder)</em></li>
            <li><span className="muted-light">Address:</span> Your business address here <em>(placeholder)</em></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} CRB Uniforms &amp; Garments</span>
        <span>Photography via Unsplash (Unsplash License)</span>
      </div>
    </footer>
  );
}

/* ---------------- App ---------------- */
function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [route, setRoute] = useState(() => ({ id: productIdFromPath(window.location.pathname), focusQuote: false }));
  const pendingScroll = useRef(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    let alive = true;
    fetch('/api/public/products')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load products'))))
      .then((d) => { if (alive) setProducts(d.products || []); })
      .catch((e) => { if (alive) setLoadError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      const id = productIdFromPath(window.location.pathname);
      setRoute({ id, focusQuote: false });
      pendingScroll.current = id ? { top: 0 } : { top: (e.state && e.state.scrollY) || 0 };
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Apply scroll targets after each route change has rendered.
  useEffect(() => {
    const t = pendingScroll.current;
    if (!t) return;
    pendingScroll.current = null;
    requestAnimationFrame(() => {
      if (t.anchor) scrollToId(t.anchor);
      else window.scrollTo(0, t.top || 0);
    });
  });

  const openProduct = useCallback((p, opts = {}) => {
    if (!productIdFromPath(window.location.pathname)) {
      window.history.replaceState({ ...(window.history.state || {}), scrollY: window.scrollY }, '');
    }
    window.history.pushState({ product: p.id }, '', `/product/${encodeURIComponent(p.id)}`);
    // With focusQuote the product page scrolls to its own quote form instead.
    pendingScroll.current = opts.focusQuote ? null : { top: 0 };
    setRoute({ id: p.id, focusQuote: !!opts.focusQuote });
  }, []);

  const goHome = useCallback((anchor) => {
    const onProduct = !!productIdFromPath(window.location.pathname);
    if (onProduct) {
      window.history.pushState({}, '', anchor ? `/#${anchor}` : '/');
      setRoute({ id: null, focusQuote: false });
      pendingScroll.current = anchor ? { anchor } : { top: 0 };
    } else if (anchor) {
      scrollToId(anchor);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const onNav = useCallback((id) => goHome(id), [goHome]);
  const onHeroAction = useCallback((action) => {
    if (action === 'kids') { setCategory('Kids Wear'); goHome('collection'); return; }
    goHome(action);
  }, [goHome]);
  const onCategory = useCallback((c) => { setCategory(c); setQuery(''); goHome('collection'); }, [goHome]);
  const onHome = useCallback(() => { setQuery(''); setCategory('All'); goHome(); }, [goHome]);

  // Typing a search while on a product page brings you back to the results.
  const setQueryAndShow = useCallback((q) => {
    setQuery(q);
    if (q && productIdFromPath(window.location.pathname)) goHome('collection');
  }, [goHome]);

  // Deep link to an anchor on first load (e.g. /#quote).
  useEffect(() => {
    if (!loading && window.location.hash && !route.id) scrollToId(window.location.hash.slice(1));
  }, [loading]);

  const product = route.id ? products.find((p) => p.id === route.id) : null;
  useEffect(() => {
    document.title = product ? `${product.name} — CRB Uniforms` : 'CRB Uniforms — School Uniforms & Garments';
  }, [product]);

  // Subtle reveal-on-scroll (skipped when reduced motion is requested).
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll('[data-reveal]:not(.revealed)'));
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('revealed')); return undefined; }
    document.documentElement.classList.add('reveal-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('revealed'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [route.id, loading]);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products]);

  return (
    <div className="site">
      <Header query={query} setQuery={setQueryAndShow} onNav={onNav} onHome={onHome} />
      {route.id ? (
        <ProductPage product={product} products={products} loading={loading} onBack={goHome} onOpen={openProduct} focusQuote={route.focusQuote} />
      ) : (
        <Home
          products={products}
          loading={loading}
          loadError={loadError}
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          onOpen={openProduct}
          onHeroAction={onHeroAction}
        />
      )}
      <Footer onNav={onNav} onCategory={onCategory} categories={categories} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

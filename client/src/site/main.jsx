import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Carousel from './Carousel.jsx';
import GarmentArt from './GarmentArt.jsx';
import QuoteForm from './QuoteForm.jsx';
import './site.css';

const PROMO_SLIDES = [
  { key: 'promo-bulk', eyebrow: 'Bulk orders', title: 'Uniforms for your whole school', text: 'From pre-primary pinafores to senior trousers — one manufacturer, consistent quality and on-time delivery.' },
  { key: 'promo-custom', eyebrow: 'Made to order', title: 'Your colours, your crest', text: 'Custom fabrics, embroidery and sizing charts tailored to your institution.' },
  { key: 'promo-quote', eyebrow: 'Fast quotes', title: 'Tell us what you need', text: 'Share a few details and our team will get back to you with pricing.' },
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
  const hay = `${product.name} ${product.category} ${product.description} ${product.details}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

function ProductCard({ product, onOpen }) {
  const price = formatPrice(product.price);
  return (
    <article className="product-card">
      <button type="button" className="product-card-btn" onClick={() => onOpen(product)} aria-label={`View details for ${product.name}`}>
        <GarmentArt product={product} className="product-card-media" />
        <div className="product-card-body">
          <span className="chip">{product.category}</span>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <div className="product-card-foot">
            <span className={price ? 'price' : 'price muted'}>{price || 'Price on request'}</span>
            <span className="link">View details →</span>
          </div>
        </div>
      </button>
    </article>
  );
}

function ProductDetail({ product, products, onClose, loading }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current && dialogRef.current.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose]);

  const price = product && formatPrice(product.price);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="product-title" tabIndex={-1} ref={dialogRef}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        {!product ? (
          <div className="modal-empty">
            <h2 id="product-title">{loading ? 'Loading…' : 'Product not found'}</h2>
            {!loading && <p>This product may no longer be available. <button type="button" className="btn btn-ghost" onClick={onClose}>Browse all products</button></p>}
          </div>
        ) : (
          <div className="detail">
            <div className="detail-media"><GarmentArt product={product} /></div>
            <div className="detail-info">
              <span className="chip">{product.category}</span>
              <h2 id="product-title">{product.name}</h2>
              {product.tagline && <p className="detail-tagline">{product.tagline}</p>}
              <p>{product.description}</p>
              {product.details && <p className="muted">{product.details}</p>}
              <dl className="detail-specs">
                {product.sizes && (<><dt>Sizes</dt><dd>{product.sizes}</dd></>)}
                <dt>Price</dt><dd>{price || 'On request — ask for a quote'}</dd>
                <dt>Product code</dt><dd>{product.id.toUpperCase()}</dd>
              </dl>
            </div>
            <div className="detail-quote">
              <QuoteForm
                key={product.id}
                products={products}
                fixedProduct={product}
                title={`Request a quote for ${product.name}`}
                intro="Leave your details and we'll get back to you with pricing and availability."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(() => productIdFromPath(window.location.pathname));

  useEffect(() => {
    let alive = true;
    fetch('/api/public/products')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load products'))))
      .then((d) => { if (alive) setProducts(d.products || []); })
      .catch((e) => { if (alive) setLoadError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onPop = () => setOpenId(productIdFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openProduct = useCallback((p) => {
    window.history.pushState({ product: p.id }, '', `/product/${encodeURIComponent(p.id)}`);
    setOpenId(p.id);
  }, []);
  const closeProduct = useCallback(() => {
    if (window.history.state && window.history.state.product) window.history.back();
    else window.history.replaceState(null, '', '/');
    setOpenId(null);
  }, []);

  const openProductObj = openId ? products.find((p) => p.id === openId) : null;
  useEffect(() => {
    document.title = openProductObj ? `${openProductObj.name} — CRB Uniforms` : 'CRB Uniforms — School Uniforms & Garments';
  }, [openProductObj]);

  const filtered = useMemo(() => products.filter((p) => matches(p, query.trim())), [products, query]);

  const slides = useMemo(() => {
    const featured = products.filter((p) => p.featured);
    const pool = (featured.length ? featured : products).slice(0, 5).map((p) => ({
      key: `p-${p.id}`,
      product: p,
      eyebrow: p.category,
      title: p.name,
      text: p.tagline || p.description,
    }));
    let i = 0;
    while (pool.length < 5 && i < PROMO_SLIDES.length) pool.push(PROMO_SLIDES[i++]);
    return pool.slice(0, 5);
  }, [products]);

  const gridRef = useRef(null);
  const onSearch = (e) => setQuery(e.target.value);
  const onSearchSubmit = (e) => {
    e.preventDefault();
    gridRef.current && gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="site">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="site-brand" href="/" onClick={(e) => { e.preventDefault(); setQuery(''); if (openId) closeProduct(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="brand-swatch" aria-hidden="true" />
            <span>
              <span className="brand-name">CRB</span>
              <span className="brand-sub">Uniforms &amp; Garments</span>
            </span>
          </a>
          <form className="site-search" role="search" onSubmit={onSearchSubmit}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={onSearch}
              placeholder="Search products, e.g. shirt, kids, uniform…"
              aria-label="Search products"
            />
            {query && <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
          </form>
          <a className="btn btn-primary header-cta" href="#quote">Get a quote</a>
        </div>
      </header>

      <main>
        <div className="container">
          {!query && <Carousel slides={slides} onOpen={openProduct} />}

          <section className="products" id="products" ref={gridRef} aria-labelledby="products-title">
            <div className="section-head">
              <h2 id="products-title">{query ? 'Search results' : 'Our products'}</h2>
              <span className="muted">
                {loading ? 'Loading…' : query ? `${filtered.length} of ${products.length} products match “${query.trim()}”` : `${products.length} products`}
              </span>
            </div>
            {loadError && <div className="qf-alert" role="alert">{loadError}. Please refresh the page.</div>}
            {loading ? (
              <div className="product-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="product-card skeleton" />)}</div>
            ) : filtered.length ? (
              <div className="product-grid">{filtered.map((p) => <ProductCard key={p.id} product={p} onOpen={openProduct} />)}</div>
            ) : (
              <div className="empty">
                <p>No products match “{query.trim()}”.</p>
                <button type="button" className="btn btn-ghost" onClick={() => setQuery('')}>Clear search</button>
              </div>
            )}
          </section>

          <section className="quote-section" id="quote" aria-labelledby="quote-title">
            <div className="quote-copy">
              <h2 id="quote-title">Request a quote</h2>
              <p>Tell us which product you're interested in and how to reach you. Our team will reply with pricing, fabric options and delivery timelines.</p>
              <ul className="quote-points">
                <li>Bulk pricing for schools &amp; institutions</li>
                <li>Custom colours, crests and sizing</li>
                <li>No obligation — we'll simply get in touch</li>
              </ul>
            </div>
            <div className="quote-card">
              <QuoteForm products={products} title="" />
            </div>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">© {new Date().getFullYear()} CRB Uniforms &amp; Garments. All rights reserved.</div>
      </footer>

      {openId && <ProductDetail product={openProductObj} products={products} onClose={closeProduct} loading={loading} />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

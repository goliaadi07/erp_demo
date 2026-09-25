import React, { useEffect, useId, useState } from 'react';
import { LIMITS, validateQuote } from './validation.js';

const EMPTY = { firstName: '', surname: '', mobile: '', email: '', productId: '', website: '' };

export default function QuoteForm({ products, fixedProduct = null, title = 'Request a quote', intro }) {
  const uid = useId();
  const [values, setValues] = useState(() => ({ ...EMPTY, productId: fixedProduct ? fixedProduct.id : '' }));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    if (fixedProduct) setValues((v) => ({ ...v, productId: fixedProduct.id }));
  }, [fixedProduct && fixedProduct.id]);

  const set = (key) => (e) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    if (touched[key]) setErrors(validateQuote(next));
  };
  const blur = (key) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validateQuote(values));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateQuote(values);
    setErrors(errs);
    setTouched({ firstName: true, surname: true, mobile: true, email: true, productId: true });
    if (Object.keys(errs).length) {
      setStatus({ state: 'error', message: 'Please correct the highlighted fields.' });
      return;
    }
    setStatus({ state: 'sending', message: '' });
    try {
      const r = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          surname: values.surname.trim(),
          mobile: values.mobile.trim(),
          email: values.email.trim(),
          productId: values.productId,
          website: values.website,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }
      setStatus({ state: 'success', message: data.message || 'Thank you! Your quote request has been received.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const reset = () => {
    setValues({ ...EMPTY, productId: fixedProduct ? fixedProduct.id : '' });
    setErrors({});
    setTouched({});
    setStatus({ state: 'idle', message: '' });
  };

  if (status.state === 'success') {
    const p = (products || []).find((x) => x.id === values.productId) || fixedProduct;
    return (
      <div className="quote-success" role="status" aria-live="polite">
        <div className="quote-success-icon" aria-hidden="true">✓</div>
        <h3>Request sent</h3>
        <p>{status.message}</p>
        {p && <p className="muted">Product: <b>{p.name}</b></p>}
        <button type="button" className="btn btn-ghost" onClick={reset}>Send another request</button>
      </div>
    );
  }

  const field = (key, label, props = {}) => {
    const id = `${uid}-${key}`;
    const err = touched[key] && errors[key];
    return (
      <div className={`qf-field${err ? ' has-error' : ''}`}>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          name={key}
          value={values[key]}
          onChange={set(key)}
          onBlur={blur(key)}
          maxLength={LIMITS[key]}
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-err` : undefined}
          required
          {...props}
        />
        {err && <span className="qf-error" id={`${id}-err`}>{err}</span>}
      </div>
    );
  };

  const productErr = touched.productId && errors.productId;
  return (
    <form className="quote-form" onSubmit={submit} noValidate>
      {title && <h3 className="qf-title">{title}</h3>}
      {intro && <p className="qf-intro">{intro}</p>}
      <div className="qf-grid">
        {field('firstName', 'First name', { autoComplete: 'given-name' })}
        {field('surname', 'Surname', { autoComplete: 'family-name' })}
        {field('mobile', 'Mobile', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '+91 98765 43210' })}
        {field('email', 'Email', { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'you@example.com' })}
        <div className={`qf-field qf-full${productErr ? ' has-error' : ''}`}>
          <label htmlFor={`${uid}-productId`}>Product</label>
          {fixedProduct ? (
            <>
              <input id={`${uid}-productId`} value={fixedProduct.name} readOnly className="qf-readonly" />
              <input type="hidden" name="productId" value={fixedProduct.id} />
            </>
          ) : (
            <select
              id={`${uid}-productId`}
              name="productId"
              value={values.productId}
              onChange={set('productId')}
              onBlur={blur('productId')}
              aria-invalid={!!productErr}
              required
            >
              <option value="">Select a product…</option>
              {(products || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.category}</option>
              ))}
            </select>
          )}
          {productErr && <span className="qf-error">{productErr}</span>}
        </div>
        {/* Honeypot: hidden from people, tempting for bots. */}
        <div className="qf-hp" aria-hidden="true">
          <label htmlFor={`${uid}-website`}>Website</label>
          <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
        </div>
      </div>
      {status.state === 'error' && <div className="qf-alert" role="alert">{status.message}</div>}
      <button type="submit" className="btn btn-primary qf-submit" disabled={status.state === 'sending'}>
        {status.state === 'sending' ? 'Sending…' : 'Request a quote'}
      </button>
      <p className="qf-note">We only use your details to respond to this request.</p>
    </form>
  );
}

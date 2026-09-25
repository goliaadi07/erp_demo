import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { LIMITS, validateQuote } from './validation.js';
import { useLang } from './i18n.js';

const EMPTY = { firstName: '', surname: '', mobile: '', email: '', productId: '', message: '', website: '' };
const FIELDS = ['firstName', 'surname', 'mobile', 'email', 'productId', 'message'];

const QuoteForm = forwardRef(function QuoteForm(
  { products, fixedProduct = null, title = 'Request a quote', intro, variant = 'default', presetProductId = '' },
  ref
) {
  const uid = useId();
  const { t } = useLang();
  const firstRef = useRef(null);
  const [values, setValues] = useState(() => ({ ...EMPTY, productId: fixedProduct ? fixedProduct.id : presetProductId }));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useImperativeHandle(ref, () => ({ focus: () => firstRef.current && firstRef.current.focus({ preventScroll: true }) }), []);

  useEffect(() => {
    if (fixedProduct) setValues((v) => ({ ...v, productId: fixedProduct.id }));
  }, [fixedProduct && fixedProduct.id]);
  useEffect(() => {
    if (!fixedProduct && presetProductId) setValues((v) => ({ ...v, productId: presetProductId }));
  }, [presetProductId]);

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
    setTouched(Object.fromEntries(FIELDS.map((f) => [f, true])));
    if (Object.keys(errs).length) {
      setStatus({ state: 'error', message: t('Please check the highlighted fields.') });
      const first = FIELDS.find((f) => errs[f]);
      const el = first && document.getElementById(`${uid}-${first}`);
      if (el) el.focus();
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
          message: values.message.trim(),
          website: values.website,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(t(data.message || 'Something went wrong. Please try again.'));
      }
      setStatus({ state: 'success', message: t(data.message || 'Thank you! Your quote request has been received.') });
    } catch (err) {
      setStatus({ state: 'error', message: err && err.message ? t(err.message) : t('Something went wrong. Please try again.') });
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
      <div className={`quote-success quote-success-${variant}`} role="status" aria-live="polite">
        <div className="quote-success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
        </div>
        <h3>{t('Thank you, {name}!', { name: values.firstName.trim() })}</h3>
        <p>{status.message}</p>
        {p && <p className="quote-success-product">{t('Your enquiry:')} <b>{t(p.name)}</b></p>}
        <p className="quote-success-note">{t('We’ll reach you at {email} or {mobile}.', { email: values.email.trim(), mobile: values.mobile.trim() })}</p>
        <button type="button" className="btn btn-ghost" onClick={reset}>{t('Send another request')}</button>
      </div>
    );
  }

  const state = (key) => {
    if (!touched[key]) return '';
    return errors[key] ? ' has-error' : (values[key] ? ' is-valid' : '');
  };

  const field = (key, label, props = {}) => {
    const id = `${uid}-${key}`;
    const err = touched[key] && errors[key] && t(errors[key]);
    return (
      <div className={`fl-field${state(key)}`}>
        <input
          ref={key === 'firstName' ? firstRef : undefined}
          id={id}
          name={key}
          value={values[key]}
          onChange={set(key)}
          onBlur={blur(key)}
          maxLength={LIMITS[key]}
          placeholder=" "
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-err` : undefined}
          required
          {...props}
        />
        <label htmlFor={id}>{label} <span className="req" aria-hidden="true">*</span></label>
        <span className="fl-check" aria-hidden="true" />
        {err && <span className="fl-error" id={`${id}-err`}>{err}</span>}
      </div>
    );
  };

  const productErr = touched.productId && errors.productId && t(errors.productId);
  const messageErr = touched.message && errors.message && t(errors.message);
  return (
    <form className={`quote-form quote-form-${variant}`} onSubmit={submit} noValidate>
      {title && <h3 className="qf-title">{title}</h3>}
      {intro && <p className="qf-intro">{intro}</p>}
      <div className="qf-grid">
        {field('firstName', t('First name'), { autoComplete: 'given-name' })}
        {field('surname', t('Surname'), { autoComplete: 'family-name' })}
        {field('mobile', t('Mobile number'), { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
        {field('email', t('Email address'), { type: 'email', inputMode: 'email', autoComplete: 'email' })}
        <div className={`fl-field fl-select qf-full${state('productId')}`}>
          {fixedProduct ? (
            <>
              <input id={`${uid}-productId`} value={t(fixedProduct.name)} readOnly className="fl-readonly" aria-readonly="true" placeholder=" " />
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
              aria-describedby={productErr ? `${uid}-productId-err` : undefined}
              required
            >
              <option value="">{t('Choose a product…')}</option>
              {(products || []).map((p) => (
                <option key={p.id} value={p.id}>{t(p.name)} — {t(p.category)}</option>
              ))}
            </select>
          )}
          <label htmlFor={`${uid}-productId`}>{t('Product')} <span className="req" aria-hidden="true">*</span></label>
          {productErr && <span className="fl-error" id={`${uid}-productId-err`}>{productErr}</span>}
        </div>
        <div className={`fl-field fl-textarea qf-full${touched.message ? (errors.message ? ' has-error' : '') : ''}`}>
          <textarea
            id={`${uid}-message`}
            name="message"
            rows={3}
            value={values.message}
            onChange={set('message')}
            onBlur={blur('message')}
            maxLength={LIMITS.message}
            placeholder=" "
            aria-invalid={!!messageErr}
            aria-describedby={`${uid}-message-hint${messageErr ? ` ${uid}-message-err` : ''}`}
          />
          <label htmlFor={`${uid}-message`}>{t('Message (optional)')}</label>
          <span className="fl-hint" id={`${uid}-message-hint`}>{t('Quantity, sizes or anything else we should know')} · {values.message.length}/{LIMITS.message}</span>
          {messageErr && <span className="fl-error" id={`${uid}-message-err`}>{messageErr}</span>}
        </div>
        {/* Honeypot: hidden from people, tempting for bots. */}
        <div className="qf-hp" aria-hidden="true">
          <label htmlFor={`${uid}-website`}>{t('Website')}</label>
          <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
        </div>
      </div>
      {status.state === 'error' && <div className="qf-alert" role="alert">{status.message}</div>}
      <button type="submit" className="btn btn-primary qf-submit" disabled={status.state === 'sending'}>
        {status.state === 'sending' ? t('Sending…') : t('Request a quote')}
        <svg className="btn-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
      <p className="qf-note">{t('No obligation. We only use your details to reply to this request.')}</p>
    </form>
  );
});

export default QuoteForm;

import React, { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 25000;

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return d.toLocaleDateString();
}

// Bell + dropdown listing public "Request a quote" submissions (JWT-protected API).
export default function QuoteBell({ getToken, open, setOpen, onUnreadChange, onUnauthorized }) {
  const [data, setData] = useState({ quotes: [], unreadCount: 0, total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const request = useCallback(async (url, opts = {}) => {
    const token = getToken();
    const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } });
    if (r.status === 401) { onUnauthorized && onUnauthorized(); throw new Error('Session expired — please sign in again.'); }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.message || 'Request failed');
    return body;
  }, [getToken, onUnauthorized]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await request('/api/quotes');
      setData({ quotes: d.quotes || [], unreadCount: d.unreadCount || 0, total: d.total || 0 });
      setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [request]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  useEffect(() => { onUnreadChange && onUnreadChange(data.unreadCount); }, [data.unreadCount, onUnreadChange]);
  useEffect(() => { if (open) load(); }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    // Clicks inside the ERP iframe don't reach this document; close on window blur instead.
    const onBlur = () => setTimeout(() => { if (document.activeElement && document.activeElement.tagName === 'IFRAME') setOpen(false); }, 0);
    window.addEventListener('blur', onBlur);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); window.removeEventListener('blur', onBlur); };
  }, [open, setOpen]);

  const markRead = async (id) => {
    setData((d) => ({ ...d, quotes: d.quotes.map((q) => (q.id === id ? { ...q, isRead: true } : q)), unreadCount: Math.max(0, d.unreadCount - 1) }));
    try {
      const r = await request(`/api/quotes/${id}/read`, { method: 'PATCH' });
      setData((d) => ({ ...d, unreadCount: r.unreadCount }));
    } catch (e) { setError(e.message); load(); }
  };
  const markAll = async () => {
    setData((d) => ({ ...d, quotes: d.quotes.map((q) => ({ ...q, isRead: true })), unreadCount: 0 }));
    try { await request('/api/quotes/read-all', { method: 'POST' }); } catch (e) { setError(e.message); load(); }
  };

  const unread = data.unreadCount;
  return (
    <div className="qb-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`qb-bell${unread ? ' has-unread' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={unread ? `Quote requests: ${unread} unread` : 'Quote requests'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Quote requests"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>
        {unread > 0 && <span className="qb-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="qb-panel" role="dialog" aria-label="Quote requests">
          <div className="qb-head">
            <div>
              <b>Quote requests</b>
              <span className="qb-sub">{unread} unread · {data.total} total</span>
            </div>
            <div className="qb-head-actions">
              <button type="button" onClick={load} disabled={loading} title="Refresh">{loading ? '…' : '↻'}</button>
              <button type="button" onClick={markAll} disabled={!unread}>Mark all read</button>
            </div>
          </div>
          {error && <div className="qb-error">{error}</div>}
          <div className="qb-list">
            {data.quotes.length === 0 && !error && <div className="qb-empty">No quote requests yet. Requests from the public website will appear here.</div>}
            {data.quotes.map((q) => (
              <div key={q.id} className={`qb-item${q.isRead ? '' : ' unread'}`}>
                <div className="qb-item-top">
                  <span className="qb-name">{q.firstName} {q.surname}</span>
                  <time dateTime={q.createdAt} title={q.createdAt ? new Date(q.createdAt).toLocaleString() : ''}>{timeAgo(q.createdAt)}</time>
                </div>
                <div className="qb-product">{q.productName}</div>
                <div className="qb-contact">
                  <a href={`tel:${q.mobile.replace(/[^\d+]/g, '')}`}>{q.mobile}</a>
                  <a href={`mailto:${q.email}`}>{q.email}</a>
                </div>
                <div className="qb-item-foot">
                  <span>{q.createdAt ? new Date(q.createdAt).toLocaleString() : ''}</span>
                  {!q.isRead ? <button type="button" onClick={() => markRead(q.id)}>Mark as read</button> : <span className="qb-read">Read</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

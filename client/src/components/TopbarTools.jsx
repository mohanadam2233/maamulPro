import { Bell, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useStockAlertsQuery } from '../store/api.js';
import './TopbarTools.css';

export function WhatsAppButton() {
  const number = (import.meta.env.VITE_WHATSAPP_NUMBER || '252612575040').replace(/\D/g, '');
  const message = import.meta.env.VITE_WHATSAPP_MESSAGE || 'Hello MaamulPro support, I need assistance.';
  return <a className="mp-whatsapp" href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" aria-label="Contact support on WhatsApp" title="WhatsApp support">
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M20.52 3.48A11.91 11.91 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.15 1.6 5.95L0 24l6.26-1.64a11.9 11.9 0 0 0 5.78 1.47h.01C18.63 23.83 24 18.48 24 11.9a11.85 11.85 0 0 0-3.48-8.42ZM12.05 21.82a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.72.97.99-3.63-.24-.37a9.87 9.87 0 0 1-1.51-5.28c0-5.47 4.46-9.93 9.94-9.93a9.84 9.84 0 0 1 7.02 2.91 9.84 9.84 0 0 1 2.9 7.02c0 5.48-4.48 9.89-10 9.89Zm5.45-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.11 3.22 5.12 4.52.72.31 1.28.49 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.76-.72 2-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35Z" /></svg>
  </a>;
}

export function Notifications() {
  const user = useSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const panel = useRef(null);
  const { data, isLoading, isError, refetch } = useStockAlertsQuery(undefined, {
    skip: !user || user.role === 'SUPER_ADMIN', pollingInterval: 60000,
  });
  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type !== 'keydown' && (panel.current?.contains(event.target) || trigger.current?.contains(event.target))) return;
      setOpen(false);
      if (event.type === 'keydown') trigger.current?.focus();
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const count = data?.meta?.total || 0;
  return <>
    <button type="button" ref={trigger} className="mp-notify" aria-label={`Stock notifications${isError ? ' unavailable' : `: ${count}`}`} aria-expanded={open} aria-controls="mp-stock-notifications" onClick={() => setOpen((value) => !value)}><Bell size={19} />{!isError && count > 0 && <span className="mp-badge">{count > 99 ? '99+' : count}</span>}</button>
    {open && createPortal(<section id="mp-stock-notifications" ref={panel} className="mp-alert-panel" aria-label="Stock notifications">
      <header><b>Stock notifications</b><button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={17} /></button></header>
      {isLoading ? <p>Loading alerts…</p> : isError ? <p role="alert">Unable to load alerts. <button type="button" onClick={refetch}>Retry</button></p> : !count ? <p>No low-stock alerts.</p> : <>
        <p>{count} products at or below minimum stock.</p>
        <div className="mp-alert-list">{data.data.map((item) => <Link key={item._id} to="/products" onClick={() => setOpen(false)}><strong>{item.name}</strong><small>{item.stock === 0 ? 'Out of stock' : `Remaining: ${item.stock}`} · Minimum: {item.minimumStock}</small></Link>)}</div>
        <Link className="mp-alert-all" to="/products" onClick={() => setOpen(false)}>Open Stock Management{count > 20 ? ' · showing first 20 alerts' : ''}</Link>
      </>}
    </section>, document.body)}
  </>;
}

import { useState } from 'react';
import { Building2, CheckCircle2, Clock3, CreditCard, Plus, ShieldAlert } from 'lucide-react';
import {
  useCreateTenantMutation, useDecidePaymentMutation, useManageSubscriptionMutation,
  usePlatformOverviewQuery, usePlatformTenantsQuery,
} from '../store/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';

const inputClass = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800';

export default function Platform() {
  const { data: overview } = usePlatformOverviewQuery();
  const { data: tenants } = usePlatformTenantsQuery();
  const [decide, decision] = useDecidePaymentMutation();
  const [createTenant, createState] = useCreateTenantMutation();
  const [manageSubscription, subscriptionState] = useManageSubscriptionMutation();
  const [businessOpen, setBusinessOpen] = useState(false);
  const [subscriptionTenant, setSubscriptionTenant] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ businessName: '', slug: '', email: '', phone: '', adminName: '', username: '', password: '' });
  const [subscriptionForm, setSubscriptionForm] = useState({ action: 'ACTIVATE', months: 1, amount: 60, currency: 'USD', reason: 'Subscription managed by Super Admin' });
  const metrics = overview?.data?.metrics || {};

  const paymentDecision = async (id, choice) => {
    const reason = window.prompt(`Reason for ${choice.toLowerCase()}:`, choice === 'APPROVED' ? 'Payment verified' : 'Payment evidence requires review');
    if (reason) await decide({ id, decision: choice, reason });
  };

  const createBusiness = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await createTenant(form).unwrap();
      setBusinessOpen(false);
      setForm({ businessName: '', slug: '', email: '', phone: '', adminName: '', username: '', password: '' });
    } catch (error) { setMessage(error.data?.error?.message || 'Unable to create business'); }
  };

  const openSubscription = (tenant) => {
    const active = tenant.subscription?.status === 'ACTIVE';
    setSubscriptionTenant(tenant);
    setMessage('');
    setSubscriptionForm({
      action: active ? 'EXTEND' : 'ACTIVATE', months: 1,
      amount: ((tenant.subscription?.amountMinor || 6000) / 100).toFixed(2),
      currency: tenant.subscription?.currency || 'USD', reason: active ? 'Subscription extended by Super Admin' : 'Subscription activated by Super Admin',
    });
  };

  const saveSubscription = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await manageSubscription({
        id: subscriptionTenant._id,
        action: subscriptionForm.action,
        months: Number(subscriptionForm.months),
        amountMinor: Math.round(Number(subscriptionForm.amount || 0) * 100),
        currency: subscriptionForm.currency,
        reason: subscriptionForm.reason,
      }).unwrap();
      setSubscriptionTenant(null);
    } catch (error) { setMessage(error.data?.error?.message || 'Unable to update subscription'); }
  };

  return <>
    <PageHeader title="Platform Control" subtitle="Super Admin controls businesses, subscriptions and access" action={<button className="primary" onClick={() => setBusinessOpen(true)}><Plus /> New business</button>} />
    <section className="platform-metrics"><article><Building2 /><div><span>All businesses</span><b>{metrics.tenants || 0}</b></div></article><article><CheckCircle2 /><div><span>Active</span><b>{metrics.active || 0}</b></div></article><article><Clock3 /><div><span>Pending payments</span><b>{metrics.pendingPayments || 0}</b></div></article><article><ShieldAlert /><div><span>Suspended</span><b>{metrics.suspended || 0}</b></div></article></section>

    <section className="panel"><h2>Payment review queue</h2><div className="table-wrap"><table><thead><tr><th>Business</th><th>Reference</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead><tbody>{overview?.data?.recentPayments?.length ? overview.data.recentPayments.map((payment) => <tr key={payment._id}><td>{payment.tenantId?.name || 'Unknown'}</td><td>{payment.reference}</td><td>${(payment.amountMinor / 100).toFixed(2)}</td><td>{payment.method}</td><td><span className={`status ${payment.status === 'APPROVED' ? 'paid' : payment.status === 'PENDING_REVIEW' ? 'partial' : 'unpaid'}`}>{payment.status.replaceAll('_', ' ')}</span></td><td className="actions">{payment.status === 'PENDING_REVIEW' && <><button className="small approve" disabled={decision.isLoading} onClick={() => paymentDecision(payment._id, 'APPROVED')}>Approve</button><button className="small reject" onClick={() => paymentDecision(payment._id, 'REJECTED')}>Reject</button></>}</td></tr>) : <tr><td colSpan="6" className="p-8 text-center text-slate-500">No pending payment submissions.</td></tr>}</tbody></table></div></section>

    <section className="panel"><div className="mb-4 flex items-center justify-between"><h2 className="!m-0">Business subscriptions</h2><span className="text-xs text-slate-500">Only Super Admin can change subscription access</span></div><div className="table-wrap"><table><thead><tr><th>Business</th><th>Email</th><th>Tenant Status</th><th>Subscription</th><th>Expires</th><th>Control</th></tr></thead><tbody>{tenants?.data?.map((tenant) => <tr key={tenant._id}><td><b>{tenant.name}</b><small className="block">{tenant.slug}</small></td><td>{tenant.email}</td><td><span className={`status ${tenant.status === 'ACTIVE' ? 'paid' : 'unpaid'}`}>{tenant.status.replaceAll('_', ' ')}</span></td><td>{tenant.subscription?.status?.replaceAll('_', ' ') || 'NONE'}</td><td>{tenant.subscription?.expiresAt ? new Date(tenant.subscription.expiresAt).toLocaleDateString() : '—'}</td><td><button className="small bg-blue-600 hover:bg-blue-700" onClick={() => openSubscription(tenant)}><CreditCard className="mr-1 inline h-3.5 w-3.5" />Manage</button></td></tr>)}</tbody></table></div></section>

    {businessOpen && <Modal title="Create business account" onClose={() => setBusinessOpen(false)}><form className="form-grid" onSubmit={createBusiness}><label>Business name<input value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value, slug: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') })} required /></label><label>Workspace slug<input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required /></label><label>Business email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Admin name<input value={form.adminName} onChange={(event) => setForm({ ...form, adminName: event.target.value })} required /></label><label>Admin username<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></label><label className="full">Temporary password<input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>{message && <div className="form-error full">{message}</div>}<div className="modal-actions full"><button type="button" className="secondary" onClick={() => setBusinessOpen(false)}>Cancel</button><button className="primary" disabled={createState.isLoading}>{createState.isLoading ? 'Creating…' : 'Create business'}</button></div></form></Modal>}

    {subscriptionTenant && <Modal title={`Manage subscription — ${subscriptionTenant.name}`} onClose={() => setSubscriptionTenant(null)}><form onSubmit={saveSubscription} className="grid gap-4 p-5 sm:grid-cols-2"><label className="grid gap-2 text-xs font-bold">Action<select className={inputClass} value={subscriptionForm.action} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, action: event.target.value })}><option value="ACTIVATE">Activate / reset</option><option value="EXTEND">Extend current subscription</option><option value="SUSPEND">Suspend access</option><option value="CANCEL">Cancel subscription</option></select></label><label className="grid gap-2 text-xs font-bold">Billing months<input className={inputClass} type="number" min="1" max="60" disabled={['SUSPEND', 'CANCEL'].includes(subscriptionForm.action)} value={subscriptionForm.months} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, months: event.target.value })} required /></label><label className="grid gap-2 text-xs font-bold">Amount<input className={inputClass} type="number" min="0" step="0.01" value={subscriptionForm.amount} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, amount: event.target.value })} required /></label><label className="grid gap-2 text-xs font-bold">Currency<select className={inputClass} value={subscriptionForm.currency} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, currency: event.target.value })}><option>USD</option><option>KES</option><option>SOS</option></select></label><label className="grid gap-2 text-xs font-bold sm:col-span-2">Reason<textarea className="min-h-24 rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" minLength="3" maxLength="250" value={subscriptionForm.reason} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, reason: event.target.value })} required /></label>{message && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{message}</div>}<div className="flex justify-end gap-3 border-t border-slate-200 pt-4 sm:col-span-2 dark:border-slate-700"><button type="button" className="secondary" onClick={() => setSubscriptionTenant(null)}>Cancel</button><button className="primary" disabled={subscriptionState.isLoading}>{subscriptionState.isLoading ? 'Saving…' : 'Save subscription'}</button></div></form></Modal>}
  </>;
}

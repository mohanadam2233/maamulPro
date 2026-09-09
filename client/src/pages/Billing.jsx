import { useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { useBillingQuery, useSubmitPaymentMutation } from '../store/api.js';
import PageHeader from '../components/PageHeader.jsx';

const FALLBACK_PRICING = [{
  code: 'STANDARD',
  name: 'Standard',
  description: 'Complete business management for one company',
  currency: 'USD',
  monthly: { amountMinor: 1000, billingMonths: 1, label: 'Monthly' },
  yearly: { amountMinor: 6000, billingMonths: 12, label: 'Yearly', savingsMinor: 6000 },
}];

const money = (amountMinor = 0, currency = 'USD') => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency,
}).format(amountMinor / 100);

const formatDate = (date) => date
  ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
  : 'Not active yet';

export default function Billing() {
  const { data, isLoading } = useBillingQuery();
  const [submitPayment, submitState] = useSubmitPaymentMutation();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [form, setForm] = useState({ method: 'Mobile Money', reference: '', notes: '' });
  const [notice, setNotice] = useState(null);

  const subscription = data?.data?.subscription;
  const payments = data?.data?.payments || [];
  // The fallback keeps pricing visible while an older deployed API is restarted.
  // The updated API remains the authoritative source and recalculates the price.
  const plans = data?.data?.pricing?.length ? data.data.pricing : FALLBACK_PRICING;
  const plan = plans[0];
  const selectedPrice = plan?.[billingCycle];
  const monthlyEquivalent = billingCycle === 'yearly' && selectedPrice
    ? Math.round(selectedPrice.amountMinor / 12)
    : selectedPrice?.amountMinor;

  const renewalLabel = useMemo(() => {
    if (!subscription?.expiresAt) return 'Starts after payment approval';
    return `Access active until ${formatDate(subscription.expiresAt)}`;
  }, [subscription?.expiresAt]);

  const send = async (event) => {
    event.preventDefault();
    if (!plan || !selectedPrice) return;
    setNotice(null);

    try {
      await submitPayment({
        plan: plan.code,
        billingCycle,
        // These compatibility fields support an older API during a rolling deploy.
        // The updated server ignores their values and applies its own fixed price.
        amountMinor: selectedPrice.amountMinor,
        billingMonths: selectedPrice.billingMonths,
        currency: plan.currency,
        method: form.method,
        reference: form.reference.trim(),
        notes: form.notes.trim(),
      }).unwrap();
      setForm((current) => ({ ...current, reference: '', notes: '' }));
      setNotice({ type: 'success', text: 'Payment submitted successfully. It is now waiting for approval.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.data?.error?.message || 'Could not submit the payment. Please try again.' });
    }
  };

  if (isLoading) return <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Loading billing information…</div>;

  return <>
    <PageHeader title="Subscription & Billing" subtitle="Choose a billing period and submit your subscription payment" />

    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-blue-950/15">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">Current subscription</span>
          <ShieldCheck className="h-6 w-6 text-cyan-200" />
        </div>
        <h2 className="mt-5 text-3xl font-bold tracking-tight">{subscription?.plan || 'STANDARD'}</h2>
        <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${subscription?.status === 'ACTIVE' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-300/20 text-amber-100'}`}>
          {(subscription?.status || 'PENDING_PAYMENT').replaceAll('_', ' ')}
        </span>
        <div className="mt-8 space-y-4 border-t border-white/20 pt-5 text-sm">
          <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 text-blue-200" /><div><b className="block">Subscription access</b><span className="text-blue-100">{renewalLabel}</span></div></div>
          <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-blue-200" /><div><b className="block">Approval required</b><span className="text-blue-100">Payments are verified by the platform administrator.</span></div></div>
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between dark:border-slate-700">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">Select billing</span>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Choose your payment period</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The price is fixed and calculated automatically.</p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Billing period">
            {['monthly', 'yearly'].map((cycle) => <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className={`rounded-lg px-5 py-2 text-sm font-bold capitalize transition ${billingCycle === cycle ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
            >{cycle}</button>)}
          </div>
        </div>

        {plan && selectedPrice && <div className="mt-6 rounded-2xl border-2 border-blue-500 bg-blue-50/60 p-5 dark:bg-blue-950/20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-600" /><h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name} plan</h3></div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{plan.description}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />All core modules</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />Reports and analytics</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />Team access</span>
              </div>
            </div>
            <div className="min-w-48 text-left sm:text-right">
              <div><span className="text-3xl font-extrabold text-slate-950 dark:text-white">{money(selectedPrice.amountMinor, plan.currency)}</span><span className="text-sm text-slate-500"> / {billingCycle === 'yearly' ? 'year' : 'month'}</span></div>
              {billingCycle === 'yearly' && <><p className="mt-1 text-sm text-slate-500">Only {money(monthlyEquivalent, plan.currency)}/month</p><span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Save {money(selectedPrice.savingsMinor, plan.currency)} per year</span></>}
            </div>
          </div>
        </div>}

        <form onSubmit={send} className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Payment method
            <select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })} className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-blue-950">
              <option>Mobile Money</option><option>Bank Transfer</option><option>Cash</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Transaction reference
            <input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} minLength="3" maxLength="100" placeholder="e.g. TXN-849203" required className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-blue-950" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2 dark:text-slate-200">Notes <span className="font-normal text-slate-400">(optional)</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength="500" rows="3" placeholder="Add payment details if needed" className="rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-blue-950" />
          </label>

          <div className="rounded-xl bg-slate-50 p-4 md:col-span-2 dark:bg-slate-800/70">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">{billingCycle === 'yearly' ? 'Yearly subscription (12 months)' : 'Monthly subscription (1 month)'}</span><b>{money(selectedPrice?.amountMinor, plan?.currency)}</b></div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700"><span className="font-bold text-slate-900 dark:text-white">Total due</span><strong className="text-2xl text-blue-700 dark:text-blue-400">{money(selectedPrice?.amountMinor, plan?.currency)}</strong></div>
          </div>

          {notice && <div className={`rounded-xl border p-3 text-sm font-semibold md:col-span-2 ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{notice.text}</div>}
          <button disabled={submitState.isLoading || !selectedPrice} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60 md:col-span-2">
            <CreditCard className="h-5 w-5" />{submitState.isLoading ? 'Submitting payment…' : `Submit ${money(selectedPrice?.amountMinor, plan?.currency)} for review`}
          </button>
        </form>
      </section>
    </div>

    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">Payment history</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th>Reference</th><th>Plan</th><th>Billing</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>{payments.length ? payments.map((payment) => <tr key={payment._id}>
            <td className="font-semibold">{payment.reference}</td><td>{payment.plan || 'STANDARD'}</td><td className="capitalize">{payment.billingCycle || (payment.billingMonths === 12 ? 'yearly' : 'monthly')}</td><td>{money(payment.amountMinor, payment.currency)}</td><td>{payment.method}</td><td><span className={`status ${payment.status === 'APPROVED' ? 'paid' : payment.status === 'PENDING_REVIEW' ? 'partial' : 'unpaid'}`}>{payment.status.replaceAll('_', ' ')}</span></td><td>{formatDate(payment.createdAt)}</td>
          </tr>) : <tr><td colSpan="7" className="empty">No subscription payments submitted yet.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  </>;
}

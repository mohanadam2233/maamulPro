import './Settlement.css';
import { printSettlement } from '../utils/printSettlement.js';
import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import {
  useBusinessPaymentsQuery,
  useMakeSupplierPaymentMutation,
  useReceiveCustomerPaymentMutation,
  usePosCatalogQuery,
} from '../store/api.js';

const today = () => new Date().toISOString().slice(0, 10);
const money = (minor = 0) => `$${(Number(minor) / 100).toFixed(2)}`;
const toMinor = (value) => Math.round(Number(value || 0) * 100);
const inputClass = 'h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-950';

function PaymentWorkspace({ type, onBack, onSaved }) {
  const customerMode = type === 'customer';
  const resource = customerMode ? 'customers' : 'vendors';
  const title = customerMode ? 'Receive Customer Payment' : 'Make Supplier Payment';
  const partyLabel = customerMode ? 'Customer Name' : 'Supplier';
  const actionLabel = customerMode ? 'Receive' : 'Make Payment';
  const [account, setAccount] = useState('EVC Plus');
  const [paymentDate, setPaymentDate] = useState(today());
  const [company, setCompany] = useState('');
  const [forms, setForms] = useState({});
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const { data, isLoading, isError } = usePosCatalogQuery(resource);
  const [receivePayment, receiveState] = useReceiveCustomerPaymentMutation();
  const [makePayment, supplierState] = useMakeSupplierPaymentMutation();
  const saving = receiveState.isLoading || supplierState.isLoading;

  const matchedParties = useMemo(() => (data?.data || []).filter((party) => party.balanceMinor > 0 && (!company || party.name.toLowerCase().includes(company.toLowerCase()))), [data, company]);
  const parties = matchedParties.filter((party) => {
    const row = forms[party._id] || {};
    const remaining = party.balanceMinor - toMinor(row.paid) - toMinor(row.discount);
    return balanceFilter === 'all' || (balanceFilter === 'zero' ? remaining === 0 : remaining < 0);
  });
  const totalOutstanding = parties.reduce((sum, party) => sum + party.balanceMinor, 0);
  const getForm = (id) => forms[id] || { paid: '', discount: '0', reference: '' };
  const setFormValue = (id, key, value) => setForms((current) => ({ ...current, [id]: { ...getForm(id), [key]: value } }));

  const submit = async (party) => {
    if (saving) return;
    const form = getForm(party._id);
    const amountMinor = toMinor(form.paid);
    const discountMinor = toMinor(form.discount);
    setNotice({ type: '', message: '' });
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return setNotice({ type: 'error', message: 'Payment must be greater than zero.' });
    if (!Number.isSafeInteger(discountMinor) || discountMinor < 0 || amountMinor + discountMinor > party.balanceMinor) return setNotice({ type: 'error', message: 'Payment and discount cannot exceed the outstanding balance.' });
    if (!paymentDate) return setNotice({ type: 'error', message: 'Select a payment date.' });
    if (form.reference.trim().length < 2) return setNotice({ type: 'error', message: 'Enter a valid transaction reference.' });
    try {
      const body = { partyId: party._id, amountMinor, discountMinor, reference: form.reference.trim(), account, paymentDate };
      if (customerMode) await receivePayment(body).unwrap();
      else await makePayment(body).unwrap();
      setForms((current) => ({ ...current, [party._id]: { paid: '', discount: '0', reference: '' } }));
      onSaved(`${actionLabel} recorded successfully for ${party.name}.`);
    } catch (error) {
      setNotice({ type: 'error', message: error.data?.error?.message || 'Unable to record payment.' });
    }
  };

  return <div className="supplier-workspace settlement-page text-slate-800 dark:text-slate-100">
    <div className="mb-1 flex items-center justify-between border-b border-slate-300 pb-2"><div><p className="text-xs text-slate-500">View / Search Payments</p><h1 className="mt-2 text-lg font-medium">{customerMode ? title : 'Make Payment'}</h1></div><div className="flex gap-1"><button title="Toggle rows whose entered payment settles the balance" aria-pressed={balanceFilter === 'zero'} onClick={() => setBalanceFilter(balanceFilter === 'zero' ? 'all' : 'zero')} className="h-9 rounded bg-green-500 px-3 text-xs font-bold text-white">Equal 0</button><button title="Toggle rows where entered payment exceeds the balance" aria-pressed={balanceFilter === 'negative'} onClick={() => setBalanceFilter(balanceFilter === 'negative' ? 'all' : 'negative')} className="h-9 rounded bg-amber-500 px-3 text-xs font-bold text-white">Less than 0</button><button onClick={onBack} className="inline-flex h-9 items-center gap-1 rounded bg-red-500 px-3 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" />Back</button></div></div>
    <section className="border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 grid gap-3 md:grid-cols-3"><select value={account} onChange={(event) => setAccount(event.target.value)} className={inputClass}><option>EVC Plus</option><option>Cash</option><option>Bank</option><option>eDahab</option><option>Zaad</option></select><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className={inputClass} /><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder={customerMode ? 'Search customer' : 'Raadi Shirkadda'} className={inputClass} /></div>
      {isError && <p role="alert">Unable to load balances. Please reopen this page to retry.</p>}
      {notice.message && <div role="alert" className={`mb-2 rounded border px-3 py-2 text-sm font-semibold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.message}</div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className={customerMode ? 'bg-[#337fb5] text-white' : 'bg-green-100 text-slate-900'}><tr>{['#', partyLabel, 'Amount', 'Paid', 'Discount', 'Balance', 'Reference', 'Action'].map((heading) => <th key={heading} className="border border-slate-300 px-2 py-2 text-left">{heading}</th>)}</tr></thead>
        <tbody>{isLoading ? <tr><td colSpan="8" className="border p-8 text-center">Loading…</td></tr> : parties.length ? parties.map((party, index) => {
          const form = getForm(party._id);
          const remaining = party.balanceMinor - toMinor(form.paid) - toMinor(form.discount);
          return <tr key={party._id}><td className="border p-2">{index + 1}</td><td className="border p-2">{party.name}</td><td className="border p-2 font-semibold">{money(party.balanceMinor)}</td><td className="border p-2"><input type="number" min="0" step="0.01" value={form.paid} onChange={(event) => setFormValue(party._id, 'paid', event.target.value)} className={inputClass} /></td><td className="border p-2"><input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setFormValue(party._id, 'discount', event.target.value)} className={inputClass} /></td><td className="border p-2"><input readOnly value={(remaining / 100).toFixed(2)} className={inputClass} /></td><td className="border p-2"><input value={form.reference} onChange={(event) => setFormValue(party._id, 'reference', event.target.value)} className={inputClass} /></td><td className="border p-2"><button disabled={saving} onClick={() => submit(party)} className="h-9 rounded bg-green-500 px-3 text-xs font-bold text-white hover:bg-green-600 disabled:opacity-60">{actionLabel}</button></td></tr>;
        }) : <tr><td colSpan="8" className="border p-8 text-center">No outstanding balances.</td></tr>}</tbody>
        <tfoot><tr><td colSpan="2" className="border p-2 text-right font-bold">Total</td><td className="border p-2 font-bold">{money(totalOutstanding)}</td><td colSpan="5" className="border" /></tr></tfoot>
      </table></div>
    </section>
  </div>;
}

export default function Payments() {
  const role = useSelector((state) => state.auth.user?.role);
  const [mode, setMode] = useState('list');
  const [filters, setFilters] = useState({ from: today(), to: today(), search: '', type: 'SUPPLIER_PAYMENT' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const { data, isLoading, error } = useBusinessPaymentsQuery({ ...appliedFilters, page, limit });
  const payments = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };

  if (mode === 'customer' || mode === 'supplier') return <PaymentWorkspace type={mode} onBack={() => setMode('list')} onSaved={(message) => { setNotice({ type: 'success', message }); setPage(1); setMode('list'); }} />;

  return <div className="settlement-page text-slate-800 dark:text-slate-100">
    <div className="mb-2 flex flex-col gap-3 border-b border-slate-300 pb-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-slate-500">Payment</p><h1 className="mt-2 text-lg font-medium">Payment List</h1></div>{['BUSINESS_ADMIN', 'ACCOUNTANT'].includes(role) && <button onClick={() => { setNotice({ type: '', message: '' }); setMode('supplier'); }} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-bold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Add New Payment</button>}</div>
    <section className="border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {notice.message && <div role="status" className="mb-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300">{notice.message}</div>}
      {error && <div role="alert" className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.data?.error?.message || 'Unable to load payments.'}</div>}
      <div className="mb-2 grid gap-3 lg:grid-cols-[1fr_1fr_auto]"><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className={inputClass} /><input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className={inputClass} /><button onClick={() => { setPage(1); setAppliedFilters(filters); }} className="inline-flex h-10 items-center justify-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white"><Search className="h-4 w-4" />Search</button></div>
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm">Show<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="h-9 rounded border bg-white px-2 dark:bg-slate-800"><option>10</option><option>25</option><option>50</option></select>entries</label><label className="flex items-center gap-2 text-sm font-bold">Search:<input value={filters.search} onChange={(event) => { const search = event.target.value; const next = { ...filters, search }; setFilters(next); setAppliedFilters(next); setPage(1); }} className={`${inputClass} sm:w-52`} /></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-sm"><thead className="bg-[#247db8] text-white"><tr>{['Pay No', 'Date', 'Reference', 'Supplier Name', 'Account', 'Amount', 'Discount', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2 text-left text-white">{heading}</th>)}</tr></thead><tbody>{isLoading ? <tr><td colSpan="8" className="border p-8 text-center">Loading…</td></tr> : payments.length ? payments.map((payment) => <tr key={payment._id} className="even:bg-stone-100 dark:even:bg-slate-800"><td className="border p-2">{payment.paymentNumber}</td><td className="border p-2">{new Date(payment.paymentDate).toLocaleDateString()}</td><td className="border p-2">{payment.reference}</td><td className="border p-2">{payment.vendorId?.name || '—'}</td><td className="border p-2">{payment.account}</td><td className="border p-2">{money(payment.amountMinor)}</td><td className="border p-2">{money(payment.discountMinor)}</td><td className="border p-2"><button type="button" onClick={() => printSettlement([payment], 'Supplier Payment')} className="rounded bg-[#337fb5] px-3 py-1.5 text-xs font-bold text-white">Print</button></td></tr>) : <tr><td colSpan="8" className="border p-8 text-center">No data available in table</td></tr>}</tbody></table></div>
      <footer className="flex flex-col gap-3 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>Showing {payments.length ? (meta.page - 1) * limit + 1 : 0} to {Math.min(meta.page * limit, meta.total)} of {meta.total} entries</span><div className="flex items-center gap-2"><button disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} className="grid h-8 w-8 place-items-center border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>{meta.page}</span><button disabled={meta.page >= meta.pages} onClick={() => setPage(meta.page + 1)} className="grid h-8 w-8 place-items-center border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></footer>
    </section>
  </div>;
}

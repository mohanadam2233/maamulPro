import { useSelector } from 'react-redux';
import './Settlement.css';
import { printSettlement } from '../utils/printSettlement.js';
import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, FileDown, Plus, Printer, Search } from 'lucide-react';
import { useBusinessPaymentsQuery, useReceiveCustomerPaymentMutation, usePosCatalogQuery } from '../store/api.js';

const today = () => new Date().toISOString().slice(0, 10);
const money = (minor = 0) => `$${(Number(minor) / 100).toFixed(2)}`;
const toMinor = (value) => Math.round(Number(value || 0) * 100);
const inputClass = 'h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-950';

function exportCsv(receipts) {
  if (!receipts.length) return;
  const rows = receipts.map((receipt) => ({
    receipt: receipt.paymentNumber,
    date: new Date(receipt.paymentDate).toLocaleDateString(),
    reference: receipt.reference,
    customer: receipt.customerId?.name || '',
    account: receipt.account,
    amount: (receipt.amountMinor / 100).toFixed(2),
    discount: (receipt.discountMinor / 100).toFixed(2),
  }));
  const headers = Object.keys(rows[0]);
  const escape = (value) => { const text = String(value ?? ''); return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`; };
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `maamulpro-receipts-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ReceiveWorkspace({ onBack, onSaved }) {
  const [account, setAccount] = useState('EVC Plus');
  const [paymentDate, setPaymentDate] = useState(today());
  const [customerSearch, setCustomerSearch] = useState('');
  const [forms, setForms] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const { data, isLoading, isError } = usePosCatalogQuery('customers');
  const [receivePayment, { isLoading: saving }] = useReceiveCustomerPaymentMutation();

  const customers = useMemo(() => (data?.data || []).filter((customer) => (
    customer.balanceMinor > 0 && customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  )), [data, customerSearch]);
  const totalOutstanding = customers.reduce((sum, customer) => sum + customer.balanceMinor, 0);
  const getForm = (id) => forms[id] || { paid: '', discount: '0', reference: '' };
  const updateForm = (id, field, value) => setForms((current) => ({
    ...current,
    [id]: { ...getForm(id), [field]: value },
  }));

  const submit = async (customer) => {
    if (saving) return;
    setErrorMessage('');
    const form = getForm(customer._id);
    const amountMinor = toMinor(form.paid);
    const discountMinor = toMinor(form.discount);

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return setErrorMessage('Paid amount must be greater than zero.');
    if (!Number.isSafeInteger(discountMinor) || discountMinor < 0 || amountMinor + discountMinor > customer.balanceMinor) return setErrorMessage('Payment and discount cannot exceed the customer balance.');
    if (!paymentDate) return setErrorMessage('Select a receipt date.');
    if (form.reference.trim().length < 2) return setErrorMessage('Enter a valid transaction reference.');

    try {
      const response = await receivePayment({
        partyId: customer._id,
        amountMinor,
        discountMinor,
        reference: form.reference.trim(),
        account,
        paymentDate,
      }).unwrap();
      onSaved(`Receipt ${response.data.paymentNumber} saved successfully.`);
    } catch (error) {
      setErrorMessage(error.data?.error?.message || 'Unable to save receipt.');
    }
  };

  return <div className="settlement-page text-slate-800 dark:text-slate-100">
    <div className="mb-1 flex items-center justify-between border-b border-slate-300 pb-2">
      <div><p className="text-xs text-slate-500 dark:text-slate-400">View / Search Items Receive</p><h1 className="mt-2 text-lg font-medium">Receive</h1></div>
      <button type="button" onClick={onBack} className="inline-flex h-9 items-center gap-1 rounded bg-red-500 px-3 text-sm font-bold text-white hover:bg-red-600"><ArrowLeft className="h-4 w-4" />Back</button>
    </div>

    <section className="border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 grid gap-3 md:grid-cols-3">
        <select aria-label="Account" value={account} onChange={(event) => setAccount(event.target.value)} className={inputClass}><option>EVC Plus</option><option>Cash</option><option>Bank</option><option>eDahab</option><option>Zaad</option></select>
        <input aria-label="Receipt date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className={inputClass} />
        <input aria-label="Search customer" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Raadi Macaamil" className={inputClass} />
      </div>

      {isError && <p role="alert">Unable to load customer balances. Please reopen this page to retry.</p>}
      {errorMessage && <div role="alert" className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{errorMessage}</div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-[#337fb5] text-white"><tr>{['#', 'Customer Name', 'Amount', 'Paid', 'Discount', 'Balance', 'Reference', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
          <tbody>{isLoading ? <tr><td colSpan="8" className="border p-8 text-center">Loading…</td></tr> : customers.length ? customers.map((customer, index) => {
            const form = getForm(customer._id);
            const balance = customer.balanceMinor - toMinor(form.paid) - toMinor(form.discount);
            return <tr key={customer._id} className="even:bg-stone-100 dark:even:bg-slate-800">
              <td className="border border-slate-300 p-2 dark:border-slate-700">{index + 1}</td>
              <td className="border border-slate-300 p-2 dark:border-slate-700">{customer.name}</td>
              <td className="border border-slate-300 p-2 font-semibold dark:border-slate-700">{money(customer.balanceMinor)}</td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><input type="number" min="0.01" step="0.01" value={form.paid} onChange={(event) => updateForm(customer._id, 'paid', event.target.value)} className={inputClass} /></td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => updateForm(customer._id, 'discount', event.target.value)} className={inputClass} /></td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><input readOnly value={(balance / 100).toFixed(2)} className={inputClass} /></td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><input value={form.reference} onChange={(event) => updateForm(customer._id, 'reference', event.target.value)} className={inputClass} /></td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><button type="button" disabled={saving} onClick={() => submit(customer)} className="h-9 rounded bg-[#337fb5] px-3 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">Receive</button></td>
            </tr>;
          }) : <tr><td colSpan="8" className="border p-8 text-center">No customers have an outstanding balance.</td></tr>}</tbody>
          <tfoot><tr><td className="border p-2" /><td className="border p-2 text-right font-bold">Total</td><td className="border p-2 font-bold">{money(totalOutstanding)}</td><td colSpan="5" className="border" /></tr></tfoot>
        </table>
      </div>
    </section>
  </div>;
}

export default function Receipts() {
  const role = useSelector((state) => state.auth.user?.role);
  const canReceive = ['BUSINESS_ADMIN','BRANCH_MANAGER','ACCOUNTANT','CASHIER'].includes(role);
  const [mode, setMode] = useState('list');
  const [filters, setFilters] = useState({ from: today(), to: today(), search: '' });
  const [query, setQuery] = useState({ from: today(), to: today(), search: '', type: 'CUSTOMER_RECEIPT', page: 1, limit: 10 });
  const [notice, setNotice] = useState('');
  const { data, isLoading, isFetching, error } = useBusinessPaymentsQuery(query);
  const receipts = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };
  const pages = Math.max(1, meta.pages || 1);

  if (mode === 'receive') return <ReceiveWorkspace onBack={() => setMode('list')} onSaved={(message) => { setNotice(message); setQuery((current) => ({ ...current, page: 1 })); setMode('list'); }} />;

  const applySearch = (event) => {
    event.preventDefault();
    setQuery((current) => ({ ...current, ...filters, page: 1 }));
  };
  const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amountMinor, 0);
  const totalDiscount = receipts.reduce((sum, receipt) => sum + receipt.discountMinor, 0);

  return <div className="settlement-page text-slate-800 dark:text-slate-100">
    <div className="mb-2 flex flex-col gap-3 border-b border-slate-300 pb-2 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs text-slate-500 dark:text-slate-400">View / Search Items Receive</p><h1 className="mt-2 text-lg font-medium">Receive List</h1></div>
      <button hidden={!canReceive} type="button" onClick={() => { setNotice(''); setMode('receive'); }} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-bold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Receipt</button>
    </div>

    <section className="border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {notice && <div role="status" className="mb-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300">{notice}</div>}
      {error && <div role="alert" className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error.data?.error?.message || 'Unable to load receipts.'}</div>}

      <form onSubmit={applySearch} className="mb-2 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <input aria-label="From date" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className={inputClass} />
        <input aria-label="To date" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className={inputClass} />
        <button className="inline-flex h-10 items-center justify-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white hover:bg-blue-700"><Search className="h-4 w-4" />Search</button>
      </form>

      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2"><button type="button" disabled={!receipts.length} onClick={() => exportCsv(receipts)} className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-3 text-xs font-semibold disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800"><FileDown className="h-3.5 w-3.5" />Excel (CSV)</button><button type="button" onClick={() => printSettlement(receipts, 'Receive List')} className="h-8 border border-slate-300 bg-white px-3 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800">PDF</button><button type="button" onClick={() => printSettlement(receipts, 'Receive List')} className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-3 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800"><Printer className="h-3.5 w-3.5" />Print</button></div>
        <label className="flex items-center gap-2 text-sm font-bold">Search:<input value={filters.search} onChange={(event) => { const search = event.target.value; setFilters({ ...filters, search }); setQuery((current) => ({ ...current, search, page: 1 })); }} className={`${inputClass} sm:w-52`} /></label>
      </div>

      <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className="bg-[#247db8] text-white"><tr>{['RV No', 'Date', 'Reference', 'Customer Name', 'Account', 'Amount', 'Discount', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
        <tbody>{(isLoading || isFetching) ? <tr><td colSpan="8" className="border p-8 text-center">Loading…</td></tr> : receipts.length ? receipts.map((receipt) => <tr key={receipt._id} className="even:bg-stone-100 dark:even:bg-slate-800"><td className="border p-2">{receipt.paymentNumber}</td><td className="border p-2">{new Date(receipt.paymentDate).toLocaleDateString()}</td><td className="border p-2">{receipt.reference}</td><td className="border p-2">{receipt.customerId?.name || '—'}</td><td className="border p-2">{receipt.account}</td><td className="border p-2">{money(receipt.amountMinor)}</td><td className="border p-2">{money(receipt.discountMinor)}</td><td className="border p-2"><button type="button" onClick={() => printSettlement([receipt], 'Receipt')} className="rounded bg-[#337fb5] px-3 py-1.5 text-xs font-bold text-white">Print</button></td></tr>) : <tr><td colSpan="8" className="border p-8 text-center">No data available in table</td></tr>}</tbody>
        <tfoot><tr><td colSpan="5" className="border" /><td className="border p-2 font-bold">Page total: {money(totalAmount)}</td><td className="border p-2 font-bold">Page discount: {money(totalDiscount)}</td><td className="border" /></tr></tfoot>
      </table></div>

      <footer className="flex flex-col gap-3 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>Showing {receipts.length ? (meta.page - 1) * query.limit + 1 : 0} to {Math.min(meta.page * query.limit, meta.total)} of {meta.total} entries</span><div className="flex items-center gap-2"><button type="button" disabled={meta.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} className="grid h-8 w-8 place-items-center border disabled:opacity-40 dark:border-slate-600"><ChevronLeft className="h-4 w-4" /></button><span>{meta.page}</span><button type="button" disabled={meta.page >= pages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} className="grid h-8 w-8 place-items-center border disabled:opacity-40 dark:border-slate-600"><ChevronRight className="h-4 w-4" /></button></div></footer>
    </section>
  </div>;
}

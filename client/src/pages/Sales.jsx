import { useMemo, useState } from 'react';
import { CalendarDays, Eye, Plus, Save, Search, Trash2, UserPlus, X } from 'lucide-react';
import {
  useCreateResourceMutation,
  useCreateSaleMutation,
  useResourceListQuery,
  useSalesQuery,
} from '../store/api.js';

const today = () => new Date().toISOString().slice(0, 10);
const money = (minor = 0) => `$${(Number(minor) / 100).toFixed(2)}`;
const toMinor = (value) => Math.round(Number(value || 0) * 100);
const newLine = () => ({ key: crypto.randomUUID(), productId: '', quantity: 1 });
const inputClass = 'h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-950';

function InvoiceField({ label, required, children }) {
  return <label className="grid items-center gap-2 text-sm font-bold text-slate-800 sm:grid-cols-[165px_1fr] dark:text-slate-200">
    <span className="sm:text-right">{label}{required && <b className="ml-1 text-red-500">*</b>}</span>
    {children}
  </label>;
}

function QuickCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', creditLimit: '0' });
  const [message, setMessage] = useState('');
  const [createCustomer, { isLoading }] = useCreateResourceMutation();

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const response = await createCustomer({
        resource: 'customers',
        body: {
          name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(),
          email: form.email.trim(), balanceMinor: 0, creditLimitMinor: toMinor(form.creditLimit),
        },
      }).unwrap();
      onCreated(response.data);
    } catch (error) {
      setMessage(error.data?.error?.message || 'Unable to add customer.');
    }
  };

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-3" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="w-full max-w-xl overflow-hidden rounded bg-white shadow-2xl dark:bg-slate-900">
      <header className="flex h-12 items-center justify-between bg-[#337fb5] px-4 text-white">
        <h2 className="flex items-center gap-2 text-sm font-bold"><UserPlus className="h-4 w-4" />Add Customer</h2>
        <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
      </header>
      <form onSubmit={submit}>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <label className="text-sm font-bold sm:col-span-2">Customer Name <b className="text-red-500">*</b><input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-bold">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-bold">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-bold">Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-bold">Credit Limit ($)<input type="number" min="0" step="0.01" value={form.creditLimit} onChange={(event) => setForm({ ...form, creditLimit: event.target.value })} className={`${inputClass} mt-2`} /></label>
          {message && <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 sm:col-span-2">{message}</div>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
          <button type="button" onClick={onClose} className="h-9 rounded bg-slate-100 px-4 text-sm font-semibold dark:bg-slate-800">Cancel</button>
          <button disabled={isLoading} className="inline-flex h-9 items-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{isLoading ? 'Saving…' : 'Save'}</button>
        </footer>
      </form>
    </section>
  </div>;
}

export default function Sales() {
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState({ from: today(), to: today(), search: '', limit: 10 });
  const [query, setQuery] = useState({ from: today(), to: today(), search: '', page: 1, limit: 10 });
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [lines, setLines] = useState([newLine()]);
  const [taxRateBps, setTaxRateBps] = useState(0);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [partialPaid, setPartialPaid] = useState('0');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [customerModal, setCustomerModal] = useState(false);

  const { data: productData, isLoading: productsLoading } = useResourceListQuery({ resource: 'products', page: 1, limit: 100 });
  const { data: customerData } = useResourceListQuery({ resource: 'customers', page: 1, limit: 100 });
  const { data: salesData, isLoading: salesLoading, isFetching: salesFetching } = useSalesQuery(query);
  const [createSale, { isLoading: saving }] = useCreateSaleMutation();

  const products = useMemo(() => (productData?.data || []).filter((product) => product.isActive && product.stock > 0), [productData]);
  const customers = customerData?.data || [];
  const productMap = useMemo(() => new Map(products.map((product) => [product._id, product])), [products]);
  const selectedCustomer = customers.find((customer) => customer._id === customerId);

  const subtotalMinor = useMemo(() => lines.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    return sum + (product?.priceMinor || 0) * Number(line.quantity || 0);
  }, 0), [lines, productMap]);
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / 10000);
  const discountMinor = toMinor(discount);
  const totalMinor = Math.max(0, subtotalMinor + taxMinor - discountMinor);
  const paidMinor = paymentStatus === 'PAID' ? totalMinor : paymentStatus === 'UNPAID' ? 0 : toMinor(partialPaid);
  const balanceMinor = Math.max(0, totalMinor - paidMinor);

  const updateLine = (key, changes) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...changes } : line));
  const removeLine = (key) => setLines((current) => current.length === 1 ? [newLine()] : current.filter((line) => line.key !== key));

  const resetForm = () => {
    setCustomerId(''); setInvoiceDate(today()); setReferenceNumber(''); setLines([newLine()]);
    setTaxRateBps(0); setDiscount('0'); setPaymentMethod('Cash'); setPaymentStatus('PAID');
    setPartialPaid('0'); setNote('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setNotice({ type: '', message: '' });
    const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
    if (!validLines.length) return setNotice({ type: 'error', message: 'Add at least one invoice item.' });
    if (discountMinor > subtotalMinor + taxMinor) return setNotice({ type: 'error', message: 'Discount cannot exceed the invoice amount.' });
    if (paymentStatus === 'PARTIAL' && (paidMinor <= 0 || paidMinor >= totalMinor)) return setNotice({ type: 'error', message: 'Partial payment must be greater than zero and less than the total.' });
    if (balanceMinor > 0 && !customerId) return setNotice({ type: 'error', message: 'Select a customer for partial or unpaid invoices.' });

    try {
      const response = await createSale({
        customerId: customerId || null,
        invoiceDate,
        referenceNumber: referenceNumber.trim(),
        items: validLines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
        taxRateBps,
        discountMinor,
        paidMinor,
        paymentMethod,
        note: note.trim(),
      }).unwrap();
      resetForm();
      setNotice({ type: 'success', message: `Invoice ${response.data.invoiceNumber} saved successfully.` });
      setQuery((current) => ({ ...current, page: 1 }));
      setView('list');
    } catch (error) {
      setNotice({ type: 'error', message: error.data?.error?.message || 'Unable to save invoice.' });
    }
  };

  const searchInvoices = (event) => {
    event.preventDefault();
    setQuery({ ...filters, page: 1 });
  };

  if (view === 'list') {
    const invoices = salesData?.data || [];
    const meta = salesData?.meta || { page: 1, pages: 1, total: invoices.length };
    const firstRow = meta.total ? ((meta.page - 1) * meta.limit) + 1 : 0;
    const lastRow = Math.min(meta.page * meta.limit, meta.total);

    return <div className="text-slate-800 dark:text-slate-100">
      <div className="mb-1 flex items-center justify-between border-b-2 border-cyan-500 pb-3">
        <div><h1 className="text-lg font-medium">Invoice</h1><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Home › Sale</p></div>
      </div>

      <section className="bg-white shadow-sm dark:bg-slate-900">
        <div className="flex justify-end border-b border-slate-200 p-2 dark:border-slate-700">
          <button type="button" onClick={() => { setNotice({ type: '', message: '' }); setView('form'); }} className="inline-flex h-10 items-center gap-1 rounded bg-cyan-500 px-4 text-sm font-bold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Add Invoice</button>
        </div>

        {notice.message && <div role="status" className={`mx-2 mt-3 rounded border px-3 py-2 text-sm font-semibold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.message}</div>}

        <form onSubmit={searchInvoices} className="grid gap-3 p-2 sm:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_auto] sm:items-end">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">From date<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">To date<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <button className="inline-flex h-10 items-center justify-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white hover:bg-blue-700"><Search className="h-4 w-4" />Search</button>
        </form>

        <div className="flex flex-col gap-3 px-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm">Show<select value={filters.limit} onChange={(event) => { const limit = Number(event.target.value); setFilters({ ...filters, limit }); setQuery((current) => ({ ...current, limit, page: 1 })); }} className="h-9 rounded border border-slate-300 bg-white px-2 dark:border-slate-600 dark:bg-slate-800"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select>entries</label>
          <label className="flex items-center gap-2 text-sm font-semibold">Search:<input value={filters.search} onChange={(event) => { const search = event.target.value; setFilters({ ...filters, search }); setQuery((current) => ({ ...current, search, page: 1 })); }} className="h-9 rounded border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" /></label>
        </div>

        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[1050px] border-collapse text-xs">
            <thead className="bg-[#247db8] text-white"><tr>{['Invoice No', 'Date', 'Customer Name', 'Subtotal', 'Tax (VAT)', 'Discount', 'Paid', 'Balance', 'Status', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-3 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
            <tbody>
              {(salesLoading || salesFetching) && <tr><td colSpan="10" className="border border-slate-300 p-5 text-center dark:border-slate-700">Loading invoices…</td></tr>}
              {!salesLoading && !salesFetching && !invoices.length && <tr><td colSpan="10" className="border border-slate-300 bg-stone-50 p-5 text-center dark:border-slate-700 dark:bg-slate-800">No data available in table</td></tr>}
              {!salesFetching && invoices.map((sale) => {
                const balance = Math.max(0, sale.totalMinor - sale.paidMinor);
                return <tr key={sale._id} className="even:bg-stone-100 dark:even:bg-slate-800">
                  <td className="border border-slate-300 p-2 font-semibold text-blue-600 dark:border-slate-700 dark:text-blue-400">{sale.invoiceNumber}</td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700">{new Date(sale.invoiceDate || sale.createdAt).toLocaleDateString()}</td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700">{sale.customerId?.name || 'Cash customer'}</td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700">{money(sale.subtotalMinor)}</td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700">{money(sale.taxMinor)}</td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700">{money(sale.discountMinor)}</td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700">{money(sale.paidMinor)}</td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700">{money(balance)}</td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700"><span className={`rounded px-2 py-1 text-[11px] font-bold text-white ${sale.status === 'PAID' ? 'bg-green-500' : sale.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-red-500'}`}>{sale.status}</span></td>
                  <td className="border border-slate-300 p-2 dark:border-slate-700"><button type="button" onClick={() => window.print()} title="Print invoice list" className="inline-flex h-8 items-center gap-1 rounded bg-[#337fb5] px-3 font-semibold text-white hover:bg-blue-700"><Eye className="h-3.5 w-3.5" />View</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {firstRow} to {lastRow} of {meta.total} entries</span>
          <div className="flex items-center gap-2"><button type="button" disabled={meta.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} className="rounded border px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">Previous</button><span className="grid h-8 min-w-8 place-items-center border bg-slate-100 dark:border-slate-600 dark:bg-slate-800">{meta.page}</span><button type="button" disabled={meta.page >= meta.pages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} className="rounded border px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">Next</button></div>
        </footer>
      </section>
    </div>;
  }

  return <div className="text-slate-800 dark:text-slate-100">
    <div className="mb-4 flex items-center justify-between border-b-2 border-cyan-500 pb-4">
      <div><h1 className="text-2xl font-medium">Sale</h1><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Home › Sale › Add New Invoice</p></div>
    </div>

    <section className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="border-b border-slate-200 px-3 py-2 dark:border-slate-700"><h2 className="text-lg font-medium">Add Invoice</h2></header>
      <form onSubmit={submit}>
        <div className="grid gap-x-12 gap-y-4 p-4 lg:grid-cols-2">
          <InvoiceField label={<span className="inline-flex items-center gap-1">Name <b className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{money(selectedCustomer?.balanceMinor)}</b></span>} required>
            <div className="flex gap-2"><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={inputClass}><option value="">Please select customer</option>{customers.map((customer) => <option value={customer._id} key={customer._id}>{customer.name}</option>)}</select><button type="button" onClick={() => setCustomerModal(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded bg-cyan-500 text-white hover:bg-cyan-600"><Plus className="h-5 w-5" /></button></div>
          </InvoiceField>
          <InvoiceField label="Date" required><div className="relative"><input required type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} className={inputClass} /><CalendarDays className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /></div></InvoiceField>
          <InvoiceField label="Status" required><select className={inputClass}><option>Final</option></select></InvoiceField>
          <InvoiceField label="Reference No."><input maxLength="80" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} className={inputClass} /></InvoiceField>
        </div>

        <div className="px-3"><h3 className="mb-2 text-lg font-medium">Invoice Items</h3><div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead className="bg-blue-600 text-white"><tr>{['Item', 'Qty', 'Stock', 'Price', 'Total', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
            <tbody>{lines.map((line) => {
              const product = productMap.get(line.productId);
              const lineTotal = (product?.priceMinor || 0) * Number(line.quantity || 0);
              return <tr key={line.key}>
                <td className="border border-slate-200 p-2 dark:border-slate-700"><select value={line.productId} onChange={(event) => updateLine(line.key, { productId: event.target.value, quantity: 1 })} className={inputClass}><option value="">SELECT</option>{products.map((item) => <option value={item._id} key={item._id} disabled={item._id !== line.productId && lines.some((current) => current.productId === item._id)}>{item.name}</option>)}</select></td>
                <td className="border border-slate-200 p-2 dark:border-slate-700"><input type="number" min="1" max={product?.stock || 1} step="1" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} className={inputClass} /></td>
                <td className="border border-slate-200 p-2 dark:border-slate-700"><input readOnly value={product?.stock || 0} className={inputClass} /></td>
                <td className="border border-slate-200 p-2 dark:border-slate-700"><input readOnly value={((product?.priceMinor || 0) / 100).toFixed(2)} className={inputClass} /></td>
                <td className="border border-slate-200 p-2 dark:border-slate-700"><input readOnly value={(lineTotal / 100).toFixed(2)} className={inputClass} /></td>
                <td className="border border-slate-200 p-2 text-center dark:border-slate-700"><button type="button" onClick={() => removeLine(line.key)} className="grid h-9 w-9 place-items-center rounded bg-red-500 text-white hover:bg-red-600"><Trash2 className="h-4 w-4" /></button></td>
              </tr>;
            })}</tbody>
          </table>
        </div><button type="button" onClick={() => setLines((current) => [...current, newLine()])} className="mt-1 inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-medium text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Add Row</button></div>

        <div className="grid gap-x-12 gap-y-4 p-4 lg:grid-cols-2">
          <div className="space-y-4">
            <InvoiceField label="Tax (VAT)"><select value={taxRateBps} onChange={(event) => setTaxRateBps(Number(event.target.value))} className={inputClass}><option value="0">None</option><option value="500">VAT 5%</option><option value="1000">VAT 10%</option></select></InvoiceField>
            <InvoiceField label={<span>Payment Method <b className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{money(paidMinor)}</b></span>} required><select required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}><option value="Cash">Cash</option><option value="Mobile Money">Mobile Money</option><option value="Bank">Bank</option><option value="Credit">Credit</option></select></InvoiceField>
            <InvoiceField label="Status Payment" required><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={inputClass}><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="UNPAID">Unpaid</option></select></InvoiceField>
            <InvoiceField label="Note"><textarea maxLength="1000" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 w-full rounded border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" /></InvoiceField>
          </div>
          <div className="space-y-4">
            <InvoiceField label="Tax (VAT)"><input readOnly value={(taxMinor / 100).toFixed(2)} className={inputClass} /></InvoiceField>
            <InvoiceField label="Subtotal"><input readOnly value={(subtotalMinor / 100).toFixed(2)} className={inputClass} /></InvoiceField>
            <InvoiceField label="Discount"><input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className={inputClass} /></InvoiceField>
            <InvoiceField label="Paid Total"><input type="number" min="0" max={(totalMinor / 100).toFixed(2)} step="0.01" readOnly={paymentStatus !== 'PARTIAL'} value={paymentStatus === 'PAID' ? (totalMinor / 100).toFixed(2) : paymentStatus === 'UNPAID' ? '0.00' : partialPaid} onChange={(event) => setPartialPaid(event.target.value)} className={inputClass} /></InvoiceField>
            <InvoiceField label="Balance"><input readOnly value={(balanceMinor / 100).toFixed(2)} className={inputClass} /></InvoiceField>
          </div>
        </div>

        {notice.message && <div role="alert" className={`mx-4 mb-3 rounded border px-3 py-2 text-sm font-semibold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300'}`}>{notice.message}</div>}
        <footer className="flex justify-center gap-1 border-t border-slate-200 p-3 dark:border-slate-700"><button disabled={saving || productsLoading} className="inline-flex h-9 items-center gap-1 rounded bg-green-500 px-4 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => { resetForm(); setNotice({ type: '', message: '' }); setView('list'); }} className="inline-flex h-9 items-center gap-1 rounded bg-red-500 px-4 text-sm font-bold text-white hover:bg-red-600"><X className="h-4 w-4" />Cancel</button></footer>
      </form>
    </section>

    {customerModal && <QuickCustomerModal onClose={() => setCustomerModal(false)} onCreated={(customer) => { setCustomerModal(false); setCustomerId(customer._id); }} />}
  </div>;
}

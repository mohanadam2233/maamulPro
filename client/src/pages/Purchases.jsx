import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Eye, Plus, Save, Search, Trash2, X,
} from 'lucide-react';
import QuickSupplierModal from '../components/QuickSupplierModal.jsx';
import {
  useCreatePurchaseMutation,
  usePurchasesQuery,
  useResourceListQuery,
} from '../store/api.js';

const today = () => new Date().toISOString().slice(0, 10);
const money = (minor = 0) => `$${(Number(minor) / 100).toFixed(2)}`;
const toMinor = (value) => Math.round(Number(value || 0) * 100);
const newLine = () => ({ key: crypto.randomUUID(), productId: '', quantity: 1, unitCost: '0' });
const inputClass = 'h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-950';

function Field({ label, required, children }) {
  return <label className="grid items-center gap-2 text-sm font-bold sm:grid-cols-[175px_1fr]">
    <span className="sm:text-right">{label}{required && <b className="ml-1 text-red-500">*</b>}</span>
    {children}
  </label>;
}

function StatusBadge({ status }) {
  const style = status === 'PAID' ? 'bg-green-100 text-green-700' : status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{status}</span>;
}

export default function Purchases() {
  const [mode, setMode] = useState('list');
  const [filters, setFilters] = useState({ from: today(), to: today(), search: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [supplierModal, setSupplierModal] = useState(false);
  const [viewPurchase, setViewPurchase] = useState(null);
  const [notice, setNotice] = useState({ type: '', message: '' });

  const [vendorId, setVendorId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [lines, setLines] = useState([newLine()]);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [partialPaid, setPartialPaid] = useState('0');
  const [note, setNote] = useState('');

  const { data, isLoading, error } = usePurchasesQuery({ ...appliedFilters, page, limit });
  const { data: productData } = useResourceListQuery({ resource: 'products', page: 1, limit: 100 });
  const { data: vendorData } = useResourceListQuery({ resource: 'vendors', page: 1, limit: 100 });
  const [createPurchase, createState] = useCreatePurchaseMutation();

  const products = productData?.data || [];
  const vendors = vendorData?.data || [];
  const purchases = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };
  const productMap = useMemo(() => new Map(products.map((product) => [product._id, product])), [products]);

  const subtotalMinor = useMemo(() => lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * toMinor(line.unitCost),
    0,
  ), [lines]);
  const discountMinor = toMinor(discount);
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const paidMinor = paymentStatus === 'PAID' ? totalMinor : paymentStatus === 'UNPAID' ? 0 : toMinor(partialPaid);
  const balanceMinor = Math.max(0, totalMinor - paidMinor);

  const updateLine = (key, changes) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...changes } : line));
  const selectProduct = (line, productId) => {
    const product = productMap.get(productId);
    updateLine(line.key, { productId, quantity: 1, unitCost: product ? (product.costMinor / 100).toFixed(2) : '0' });
  };
  const removeLine = (key) => setLines((current) => current.length === 1 ? [newLine()] : current.filter((line) => line.key !== key));

  const resetForm = () => {
    setVendorId(''); setPurchaseDate(today()); setReferenceNumber(''); setLines([newLine()]);
    setDiscount('0'); setPaymentMethod('Cash'); setPaymentStatus('PAID'); setPartialPaid('0'); setNote('');
  };

  const openAdd = () => {
    resetForm();
    setNotice({ type: '', message: '' });
    setMode('add');
  };

  const submit = async (event) => {
    event.preventDefault();
    setNotice({ type: '', message: '' });
    const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
    if (!validLines.length) return setNotice({ type: 'error', message: 'Add at least one purchase item.' });
    if (discountMinor > subtotalMinor) return setNotice({ type: 'error', message: 'Discount cannot exceed the subtotal.' });
    if (paymentStatus === 'PARTIAL' && (paidMinor <= 0 || paidMinor >= totalMinor)) return setNotice({ type: 'error', message: 'Partial payment must be greater than zero and less than the total.' });

    try {
      const response = await createPurchase({
        vendorId,
        purchaseDate,
        referenceNumber: referenceNumber.trim(),
        items: validLines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), unitCostMinor: toMinor(line.unitCost) })),
        discountMinor,
        paidMinor,
        paymentMethod,
        note: note.trim(),
      }).unwrap();
      resetForm();
      setMode('list');
      setNotice({ type: 'success', message: `Purchase ${response.data.purchaseNumber} saved and stock updated.` });
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.data?.error?.message || 'Unable to save purchase.' });
    }
  };

  if (mode === 'add') return <div className="text-slate-800 dark:text-slate-100">
    <div className="mb-4 flex items-center justify-between border-b-2 border-cyan-500 pb-4"><div><h1 className="text-2xl font-medium">Purchase</h1><p className="mt-1 text-xs text-slate-500">Home › Purchase › Add New Purchase</p></div></div>
    <section className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="border-b border-slate-200 px-3 py-2 dark:border-slate-700"><h2 className="text-lg font-medium">Add Purchase</h2></header>
      <form onSubmit={submit}>
        <div className="grid gap-x-14 gap-y-4 p-4 lg:grid-cols-2">
          <Field label="Supplier Name" required><div className="flex gap-3"><select required value={vendorId} onChange={(event) => setVendorId(event.target.value)} className={inputClass}><option value="">None</option>{vendors.map((vendor) => <option value={vendor._id} key={vendor._id}>{vendor.name}</option>)}</select><button type="button" onClick={() => setSupplierModal(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded bg-cyan-500 text-white hover:bg-cyan-600"><Plus className="h-5 w-5" /></button></div></Field>
          <Field label="Purchase Date" required><input required type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} className={inputClass} /></Field>
          <Field label="Status" required><select className={inputClass}><option>Received</option></select></Field>
          <Field label="Reference No."><input maxLength="80" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} placeholder="Reference" className={inputClass} /></Field>
        </div>

        <div className="mx-3 border-y border-slate-200 py-2 dark:border-slate-700">
          <button type="button" onClick={() => setLines((current) => [...current, newLine()])} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-semibold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Add Item</button>
        </div>

        <div className="overflow-x-auto px-3 py-2"><table className="w-full min-w-[850px] border-collapse text-sm">
          <thead className="bg-[#337fb5] text-white"><tr>{['Item Name', 'Quantity', 'Rate', 'Previous Cost', 'Total Amount', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
          <tbody>{lines.map((line) => {
            const product = productMap.get(line.productId);
            return <tr key={line.key}>
              <td className="border p-2 dark:border-slate-700"><select required value={line.productId} onChange={(event) => selectProduct(line, event.target.value)} className={inputClass}><option value="">Get items</option>{products.map((item) => <option key={item._id} value={item._id} disabled={item._id !== line.productId && lines.some((current) => current.productId === item._id)}>{item.name}</option>)}</select></td>
              <td className="border p-2 dark:border-slate-700"><input required type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} className={inputClass} /></td>
              <td className="border p-2 dark:border-slate-700"><input required type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updateLine(line.key, { unitCost: event.target.value })} className={inputClass} /></td>
              <td className="border p-2 dark:border-slate-700"><input readOnly value={((product?.costMinor || 0) / 100).toFixed(2)} className={inputClass} /></td>
              <td className="border p-2 dark:border-slate-700"><input readOnly value={(Number(line.quantity || 0) * Number(line.unitCost || 0)).toFixed(2)} className={inputClass} /></td>
              <td className="border p-2 text-center dark:border-slate-700"><button type="button" onClick={() => removeLine(line.key)} className="grid h-9 w-9 place-items-center rounded bg-red-500 text-white hover:bg-red-600"><Trash2 className="h-4 w-4" /></button></td>
            </tr>;
          })}</tbody>
        </table></div>

        <div className="grid gap-x-14 gap-y-4 border-t border-slate-200 p-4 lg:grid-cols-2 dark:border-slate-700">
          <div className="space-y-4">
            <Field label="Payment Method" required><select required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}><option value="Cash">Cash</option><option value="Mobile Money">Mobile Money</option><option value="Bank">Bank</option><option value="Credit">Credit</option></select></Field>
            <Field label="Status Payment" required><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={inputClass}><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="UNPAID">Unpaid</option></select></Field>
            <Field label="Note"><textarea maxLength="1000" value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 w-full rounded border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" /></Field>
          </div>
          <div className="space-y-4">
            <Field label="Subtotal"><input readOnly value={(subtotalMinor / 100).toFixed(2)} className={inputClass} /></Field>
            <Field label="Discount"><input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className={inputClass} /></Field>
            <Field label="Paid Total"><input type="number" min="0" max={(totalMinor / 100).toFixed(2)} step="0.01" readOnly={paymentStatus !== 'PARTIAL'} value={paymentStatus === 'PAID' ? (totalMinor / 100).toFixed(2) : paymentStatus === 'UNPAID' ? '0.00' : partialPaid} onChange={(event) => setPartialPaid(event.target.value)} className={inputClass} /></Field>
            <Field label="Balance"><input readOnly value={(balanceMinor / 100).toFixed(2)} className={inputClass} /></Field>
          </div>
        </div>

        {notice.message && <div role="alert" className="mx-4 mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{notice.message}</div>}
        <footer className="flex justify-center gap-6 border-t border-slate-200 p-3 dark:border-slate-700"><button disabled={createState.isLoading} className="inline-flex h-9 min-w-40 items-center justify-center gap-1 rounded bg-green-500 px-4 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-60"><Save className="h-4 w-4" />{createState.isLoading ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setMode('list')} className="inline-flex h-9 min-w-40 items-center justify-center gap-1 rounded bg-red-500 px-4 text-sm font-bold text-white hover:bg-red-600"><X className="h-4 w-4" />Close</button></footer>
      </form>
    </section>
    {supplierModal && <QuickSupplierModal onClose={() => setSupplierModal(false)} onCreated={(supplier) => { setSupplierModal(false); setVendorId(supplier._id); }} />}
  </div>;

  return <div className="text-slate-800 dark:text-slate-100">
    <div className="mb-4 border-b-2 border-cyan-500 pb-4"><h1 className="text-xl font-medium">View/Search Purchase</h1></div>
    <section>
      <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-medium">Purchase List</h2><button onClick={openAdd} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-bold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Add Purchase</button></div>
      {notice.message && <div role="alert" className={`mb-3 rounded border px-3 py-2 text-sm font-semibold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.message}</div>}
      {error && <div role="alert" className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.data?.error?.message || 'Unable to load purchases.'}</div>}
      <div className="mb-1 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className={`${inputClass} lg:w-64`} />
        <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className={`${inputClass} lg:w-64`} />
        <button onClick={() => { setPage(1); setAppliedFilters(filters); }} className="inline-flex h-10 items-center justify-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white"><Search className="h-4 w-4" />Search</button>
      </div>
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm">Show<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="h-9 rounded border bg-white px-2 dark:bg-slate-800"><option>10</option><option>25</option><option>50</option></select>entries</label><label className="flex items-center gap-2 text-sm font-bold">Search:<input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && setAppliedFilters(filters)} className={`${inputClass} sm:w-52`} /></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[940px] border-collapse text-sm">
        <thead className="bg-[#247db8] text-white"><tr>{['#PR', 'Date', 'Supplier', 'Reference', 'Subtotal', 'Discount', 'Paid', 'Balance', 'Status', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
        <tbody>{isLoading ? <tr><td colSpan="10" className="border p-8 text-center">Loading…</td></tr> : purchases.length ? purchases.map((purchase) => <tr key={purchase._id} className="even:bg-stone-100 dark:even:bg-slate-800"><td className="border p-2 dark:border-slate-700">{purchase.purchaseNumber}</td><td className="border p-2 dark:border-slate-700">{new Date(purchase.purchaseDate || purchase.createdAt).toLocaleDateString()}</td><td className="border p-2 dark:border-slate-700">{purchase.vendorId?.name || '—'}</td><td className="border p-2 dark:border-slate-700">{purchase.referenceNumber || '—'}</td><td className="border p-2 dark:border-slate-700">{money(purchase.subtotalMinor ?? purchase.totalMinor)}</td><td className="border p-2 dark:border-slate-700">{money(purchase.discountMinor)}</td><td className="border p-2 dark:border-slate-700">{money(purchase.paidMinor)}</td><td className="border p-2 dark:border-slate-700">{money(purchase.totalMinor - purchase.paidMinor)}</td><td className="border p-2 dark:border-slate-700"><StatusBadge status={purchase.status} /></td><td className="border p-2 dark:border-slate-700"><button onClick={() => setViewPurchase(purchase)} className="inline-flex h-8 items-center gap-1 rounded bg-[#337fb5] px-3 text-xs font-bold text-white"><Eye className="h-4 w-4" />View</button></td></tr>) : <tr><td colSpan="10" className="border p-8 text-center">No data available in table</td></tr>}</tbody>
      </table></div>
      <footer className="flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>Showing {purchases.length ? (meta.page - 1) * limit + 1 : 0} to {Math.min(meta.page * limit, meta.total)} of {meta.total} entries</span><div className="flex items-center gap-2"><button disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} className="grid h-8 w-8 place-items-center border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>{meta.page}</span><button disabled={meta.page >= meta.pages} onClick={() => setPage(meta.page + 1)} className="grid h-8 w-8 place-items-center border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></footer>
    </section>

    {viewPurchase && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/65 p-3" onMouseDown={(event) => event.target === event.currentTarget && setViewPurchase(null)}><section className="w-full max-w-3xl overflow-hidden rounded bg-white shadow-2xl dark:bg-slate-900"><header className="flex h-12 items-center justify-between bg-[#337fb5] px-4 text-white"><h2 className="font-bold">{viewPurchase.purchaseNumber}</h2><button onClick={() => setViewPurchase(null)}><X className="h-4 w-4" /></button></header><div className="p-4"><div className="mb-4 grid gap-2 text-sm sm:grid-cols-2"><p><b>Supplier:</b> {viewPurchase.vendorId?.name}</p><p><b>Reference:</b> {viewPurchase.referenceNumber || '—'}</p><p><b>Total:</b> {money(viewPurchase.totalMinor)}</p><p><b>Status:</b> {viewPurchase.status}</p></div><div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead className="bg-[#337fb5] text-white"><tr><th className="border p-2 text-left text-white">Item</th><th className="border p-2 text-left text-white">Quantity</th><th className="border p-2 text-left text-white">Cost</th><th className="border p-2 text-left text-white">Total</th></tr></thead><tbody>{viewPurchase.items.map((item) => <tr key={item.productId}><td className="border p-2">{item.name}</td><td className="border p-2">{item.quantity}</td><td className="border p-2">{money(item.unitCostMinor)}</td><td className="border p-2">{money(item.lineTotalMinor)}</td></tr>)}</tbody></table></div></div></section></div>}
  </div>;
}

import { useDeferredValue, useState } from 'react';
import {
  Barcode, Boxes, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  Edit3, PackagePlus, Plus, Printer, RefreshCw, Save, SlidersHorizontal,
  Tag, Trash2, Weight, X,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import {
  useAddInventoryOptionMutation, useAdjustProductStockMutation,
  useCreateResourceMutation, useDeleteResourceMutation,
  useInventoryOptionsQuery, useResourceListQuery, useUpdateResourceMutation,
} from '../store/api.js';

const emptyItem = {
  name: '', category: '', unit: '', stock: '0', cost: '0', price: '0',
  barcode: '', minimumStock: '0', expiresAt: '',
};
const money = (minor = 0) => `$${(minor / 100).toFixed(2)}`;

// Creates a valid EAN-13 value. A new one is generated whenever Add Product opens.
export function generateBarcode() {
  const random = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 1_000_000_000);
  const firstTwelve = `${Date.now()}${random}`.replace(/\D/g, '').slice(-12).padStart(12, '0');
  const sum = [...firstTwelve].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return `${firstTwelve}${(10 - (sum % 10)) % 10}`;
}
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

const code39Patterns = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn',
};

function code39Svg(rawValue) {
  const value = String(rawValue || '').toUpperCase().replace(/[^0-9A-Z. $/+%-]/g, '-');
  const encoded = `*${value}*`;
  const narrow = 2;
  const wide = 5;
  const height = 46;
  let x = 10;
  const bars = [];
  for (const character of encoded) {
    const pattern = code39Patterns[character];
    [...pattern].forEach((widthCode, index) => {
      const width = widthCode === 'w' ? wide : narrow;
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${width}" height="${height}" fill="#111"/>`);
      x += width;
    });
    x += narrow;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} ${height}" role="img" aria-label="Barcode ${escapeHtml(value)}">${bars.join('')}</svg>`;
}

function printLabels(items) {
  if (!items.length) return false;
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) return false;
  popup.document.write(`<!doctype html><html><head><title>MaamulPro Item Labels</title><style>
    body{font-family:Arial;padding:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .label{border:1px solid #222;padding:16px;text-align:center;break-inside:avoid}.name{font-weight:700;margin-bottom:8px}
    svg{display:block;width:100%;height:46px;margin:9px auto}
    small{display:block;letter-spacing:2px}@media print{button{display:none}}
  </style></head><body><button onclick="window.print()">Print</button><div class="grid">${items.map((item) => `
    <div class="label"><div class="name">${escapeHtml(item.name)}</div>${code39Svg(item.barcode || item.sku)}
    <small>${escapeHtml(item.barcode || item.sku)}</small><div>${money(item.priceMinor)}</div></div>`).join('')}
  </div><script>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  popup.document.close();
  return true;
}

function Field({ label, icon: Icon, required, children }) {
  return <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
    <span className="mb-2 flex items-center gap-1.5">{Icon && <Icon className="h-4 w-4" />}{label}{required && <b className="text-red-500">*</b>}</span>
    {children}
  </label>;
}

const inputClass = 'h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-950';

export default function Inventory() {
  const role = useSelector((state) => state.auth.user?.role);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [menuId, setMenuId] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyItem);
  const [adjustment, setAdjustment] = useState({ amount: '', reason: '' });
  const [notice, setNotice] = useState({ type: '', message: '' });

  const { data, isLoading, error } = useResourceListQuery({ resource: 'products', search: deferredSearch, page, limit });
  const { data: optionData } = useInventoryOptionsQuery();
  const [addOption, optionState] = useAddInventoryOptionMutation();
  const [create, createState] = useCreateResourceMutation();
  const [update, updateState] = useUpdateResourceMutation();
  const [remove, removeState] = useDeleteResourceMutation();
  const [adjustStock, adjustState] = useAdjustProductStockMutation();

  const items = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };
  const options = optionData?.data || { categories: ['General'], units: ['Piece'] };
  const allSelected = items.length > 0 && items.every((item) => selected.includes(item._id));
  const announce = (type, message) => setNotice({ type, message });

  const openAdd = () => {
    setForm({ ...emptyItem, barcode: generateBarcode(), category: options.categories?.[0] || 'General', unit: options.units?.[0] || 'Piece' });
    setModal({ type: 'item', item: null });
    setNotice({ type: '', message: '' });
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      category: item.category || '',
      unit: item.unit || 'Piece',
      stock: String(item.stock),
      cost: (item.costMinor / 100).toFixed(2),
      price: (item.priceMinor / 100).toFixed(2),
      barcode: item.barcode || item.sku,
      minimumStock: String(item.minimumStock || 0),
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 10) : '',
    });
    setModal({ type: 'item', item });
    setMenuId('');
    setNotice({ type: '', message: '' });
  };

  const openAdjust = (item) => {
    setAdjustment({ amount: '', reason: '' });
    setModal({ type: 'adjust', item });
    setMenuId('');
    setNotice({ type: '', message: '' });
  };

  const createOption = async (type) => {
    const label = type === 'CATEGORY' ? 'category' : 'unit';
    const name = window.prompt(`Enter new ${label} name:`)?.trim();
    if (!name) return;
    try {
      await addOption({ type, name }).unwrap();
      setForm((current) => ({ ...current, [type === 'CATEGORY' ? 'category' : 'unit']: name }));
    } catch (err) {
      announce('error', err.data?.error?.message || `Unable to add ${label}.`);
    }
  };

  const bodyFromForm = (isNew) => ({
    name: form.name.trim(),
    ...(isNew ? { sku: form.barcode.trim().toUpperCase() } : {}),
    barcode: form.barcode.trim().toUpperCase(),
    category: form.category,
    unit: form.unit,
    costMinor: Math.round(Number(form.cost) * 100),
    priceMinor: Math.round(Number(form.price) * 100),
    minimumStock: Number(form.minimumStock),
    expiresAt: form.expiresAt || null,
    ...(isNew ? { stock: Number(form.stock) } : {}),
  });

  const saveItem = async (event) => {
    event.preventDefault();
    setNotice({ type: '', message: '' });
    try {
      if (modal.item) await update({ resource: 'products', id: modal.item._id, body: bodyFromForm(false) }).unwrap();
      else await create({ resource: 'products', body: bodyFromForm(true) }).unwrap();
      setModal(null);
      announce('success', modal.item ? 'Item updated successfully.' : 'Item added successfully.');
    } catch (err) {
      announce('error', err.data?.error?.message || 'Unable to save item.');
    }
  };

  const saveAdjustment = async (event) => {
    event.preventDefault();
    setNotice({ type: '', message: '' });
    try {
      await adjustStock({ id: modal.item._id, adjustment: Number(adjustment.amount), reason: adjustment.reason }).unwrap();
      setModal(null);
      announce('success', 'Stock adjusted successfully.');
    } catch (err) {
      announce('error', err.data?.error?.message || 'Unable to adjust stock.');
    }
  };

  const deleteItem = async (item) => {
    setMenuId('');
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await remove({ resource: 'products', id: item._id }).unwrap();
      setSelected((ids) => ids.filter((id) => id !== item._id));
      announce('success', 'Item deleted successfully.');
    } catch (err) {
      announce('error', err.data?.error?.message || 'Unable to delete item.');
    }
  };

  const toggleAll = () => setSelected(allSelected
    ? selected.filter((id) => !items.some((item) => item._id === id))
    : [...new Set([...selected, ...items.map((item) => item._id)])]);

  const printSelected = () => {
    const printable = items.filter((item) => selected.includes(item._id));
    if (!printable.length) return announce('error', 'Select at least one item to print.');
    if (!printLabels(printable)) announce('error', 'Allow browser pop-ups and try again.');
  };

  const changePage = (nextPage) => { setPage(nextPage); setSelected([]); setMenuId(''); };

  return <div className="text-slate-800 dark:text-slate-100">
    <div className="mb-5 flex items-center justify-between border-b-2 border-cyan-500 pb-4">
      <div><h1 className="mb-1 text-xl font-medium">View/Search Items</h1><p className="m-0 text-xs text-slate-500 dark:text-slate-400">Inventory › Items</p></div>
    </div>

    <section className="overflow-visible border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <h2 className="m-0 text-lg font-medium">Items List</h2>
        <div className="flex flex-wrap gap-1">
          <button onClick={openAdd} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-bold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Add item</button>
          <button onClick={printSelected} className="inline-flex h-9 items-center gap-1 rounded bg-green-500 px-3 text-sm font-bold text-white hover:bg-green-600"><Printer className="h-4 w-4" />Print Selected ({selected.length})</button>
        </div>
      </header>

      {notice.message && <div role="alert" className={`mx-3 mt-3 rounded border px-3 py-2 text-sm font-semibold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300'}`}>{notice.message}</div>}
      {error && <div className="mx-3 mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.data?.error?.message || 'Unable to load inventory.'}</div>}

      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">Show<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); changePage(1); }} className="h-9 rounded border border-slate-300 bg-white px-2 dark:border-slate-600 dark:bg-slate-800"><option>10</option><option>25</option><option>50</option></select>entries</div>
        <label className="flex items-center gap-2 text-sm font-bold">Search:<input value={search} onChange={(event) => { setSearch(event.target.value); changePage(1); }} className="h-9 w-full rounded border border-slate-300 bg-white px-3 font-normal outline-none focus:border-blue-500 sm:w-64 dark:border-slate-600 dark:bg-slate-800" /></label>
      </div>

      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-[#247db8] text-white"><tr>
            <th className="w-16 border border-blue-400 px-3 py-3 text-center text-white"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4" aria-label="Select all" /></th>
            <th className="w-14 border border-blue-400 px-3 py-3 text-left text-white">#</th>
            <th className="border border-blue-400 px-3 py-3 text-left text-white">Item Name</th>
            <th className="border border-blue-400 px-3 py-3 text-left text-white">Category</th>
            <th className="border border-blue-400 px-3 py-3 text-left text-white">Unit</th>
            <th className="border border-blue-400 px-3 py-3 text-right text-white">Cost Price</th>
            <th className="border border-blue-400 px-3 py-3 text-right text-white">Sale Price</th>
            <th className="border border-blue-400 px-3 py-3 text-right text-white">Stock Qty</th>
            <th className="w-32 border border-blue-400 px-3 py-3 text-center text-white">Action</th>
          </tr></thead>
          <tbody>{isLoading ? <tr><td colSpan="9" className="border p-10 text-center text-slate-500">Loading inventory…</td></tr> : items.length ? items.map((item, index) => <tr key={item._id} className="odd:bg-white even:bg-stone-100 hover:bg-blue-50 dark:odd:bg-slate-900 dark:even:bg-slate-800/80 dark:hover:bg-slate-800">
            <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-700"><input type="checkbox" checked={selected.includes(item._id)} onChange={() => setSelected((ids) => ids.includes(item._id) ? ids.filter((id) => id !== item._id) : [...ids, item._id])} className="h-4 w-4" /></td>
            <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-700">{(meta.page - 1) * limit + index + 1}</td>
            <td className="border border-slate-200 px-3 py-3 text-center font-medium dark:border-slate-700">{item.name}</td>
            <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-700">{item.category}</td>
            <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-700">{item.unit || 'Piece'}</td>
            <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-700">{money(item.costMinor)}</td>
            <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-700">{money(item.priceMinor)}</td>
            <td className="border border-slate-200 px-3 py-3 text-center dark:border-slate-700">{Number(item.stock).toFixed(2)}</td>
            <td className="relative border border-slate-200 px-3 py-2 text-center dark:border-slate-700">
              <button onClick={() => setMenuId(menuId === item._id ? '' : item._id)} className="inline-flex h-9 items-center gap-1 rounded bg-[#176091] px-3 text-sm text-white hover:bg-[#0f4d78]">Actions<ChevronDown className="h-3.5 w-3.5" /></button>
              {menuId === item._id && <div className="absolute right-2 top-11 z-30 w-40 overflow-hidden rounded border border-slate-200 bg-white py-1 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <button onClick={() => openEdit(item)} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700"><Edit3 className="h-4 w-4 text-blue-500" />Edit</button>
                {role === 'BUSINESS_ADMIN' && <button disabled={removeState.isLoading} onClick={() => deleteItem(item)} className="flex w-full items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" />Delete</button>}
                <button onClick={() => openAdjust(item)} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700"><Plus className="h-4 w-4 text-cyan-600" />Adjust</button>
                <button onClick={() => { setMenuId(''); printLabels([item]); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700"><Barcode className="h-4 w-4 text-green-600" />Print label</button>
              </div>}
            </td>
          </tr>) : <tr><td colSpan="9" className="border p-10 text-center text-slate-500"><PackagePlus className="mx-auto mb-2 h-9 w-9" />No items found.</td></tr>}</tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-3 border-t border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <span className="text-slate-500">Showing {items.length ? (meta.page - 1) * limit + 1 : 0} to {Math.min(meta.page * limit, meta.total)} of {meta.total} entries</span>
        <div className="flex items-center gap-2"><button disabled={meta.page <= 1} onClick={() => changePage(meta.page - 1)} className="grid h-9 w-9 place-items-center rounded border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><b>{meta.page} / {Math.max(meta.pages, 1)}</b><button disabled={meta.page >= meta.pages} onClick={() => changePage(meta.page + 1)} className="grid h-9 w-9 place-items-center rounded border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
      </footer>
    </section>

    {modal?.type === 'item' && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/65 p-3" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
      <section className="w-full max-w-5xl overflow-hidden rounded bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex h-12 items-center justify-between bg-[#337fb5] px-4 text-white"><h2 className="m-0 flex items-center gap-2 text-base font-bold"><PackagePlus className="h-4 w-4" />{modal.item ? 'Edit Product' : 'Add Product'}</h2><button type="button" onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded hover:bg-white/15"><X className="h-4 w-4" /></button></header>
        <form onSubmit={saveItem}>
          <div className="grid grid-cols-1 gap-x-7 gap-y-4 p-4 md:grid-cols-3">
            <Field label="Item Name" icon={Boxes} required><input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
            <Field label="Category" icon={Tag} required><div className="flex gap-2"><select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass}><option value="">-- Select Category --</option>{options.categories?.map((value) => <option key={value}>{value}</option>)}</select><button disabled={optionState.isLoading} type="button" onClick={() => createOption('CATEGORY')} className="grid h-11 w-11 shrink-0 place-items-center rounded bg-slate-100 text-green-600 hover:bg-slate-200 dark:bg-slate-800"><Plus className="h-4 w-4" /></button></div></Field>
            <Field label="Unit" icon={Weight} required><div className="flex gap-2"><select required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className={inputClass}><option value="">-- Select Unit --</option>{options.units?.map((value) => <option key={value}>{value}</option>)}</select><button disabled={optionState.isLoading} type="button" onClick={() => createOption('UNIT')} className="grid h-11 w-11 shrink-0 place-items-center rounded bg-slate-100 text-cyan-600 hover:bg-slate-200 dark:bg-slate-800"><Plus className="h-4 w-4" /></button></div></Field>
            <Field label="Opening Stock" icon={Boxes} required><input required disabled={Boolean(modal.item)} min="0" step="1" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-950`} /></Field>
            <Field label="Cost Price" required><input required min="0" step="0.01" type="number" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} className={inputClass} /></Field>
            <Field label="Sale Price" required><input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className={inputClass} /></Field>
            <Field label="Barcode" icon={Barcode} required><div className="flex gap-2"><input required inputMode="numeric" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value.replace(/\D/g, '') })} className={inputClass} /><button type="button" onClick={() => setForm((current) => ({ ...current, barcode: generateBarcode() }))} className="grid h-11 w-11 shrink-0 place-items-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-slate-800 dark:text-cyan-300" title="Generate another barcode" aria-label="Generate another barcode"><RefreshCw className="h-4 w-4" /></button></div></Field>
            <Field label="Minimum Qty"><input required min="0" step="1" type="number" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} className={inputClass} /></Field>
            <Field label="Expire Date" icon={CalendarDays}><input type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} className={inputClass} /></Field>
            {notice.type === 'error' && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 md:col-span-3 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{notice.message}</div>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700"><button disabled={createState.isLoading || updateState.isLoading} className="inline-flex h-9 items-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white hover:bg-[#286c9d]"><Save className="h-4 w-4" />{createState.isLoading || updateState.isLoading ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setModal(null)} className="inline-flex h-9 items-center gap-1 rounded bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"><X className="h-4 w-4" />Close</button></footer>
        </form>
      </section>
    </div>}

    {modal?.type === 'adjust' && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/65 p-4"><section className="w-full max-w-lg overflow-hidden rounded bg-white shadow-2xl dark:bg-slate-900"><header className="flex h-12 items-center justify-between bg-[#337fb5] px-4 text-white"><h2 className="m-0 text-base font-bold">Adjust Stock — {modal.item.name}</h2><button onClick={() => setModal(null)}><X className="h-4 w-4" /></button></header><form onSubmit={saveAdjustment} className="space-y-4 p-4"><p className="rounded bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">Current stock: <b>{modal.item.stock} {modal.item.unit || 'Piece'}</b>. Positive adds; negative removes.</p><Field label="Adjustment quantity" required><input required step="1" type="number" value={adjustment.amount} onChange={(event) => setAdjustment({ ...adjustment, amount: event.target.value })} placeholder="Example: 5 or -2" className={inputClass} /></Field><Field label="Reason" required><textarea required minLength="2" value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} className="min-h-24 w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" /></Field>{notice.type === 'error' && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{notice.message}</div>}<div className="flex justify-end gap-2"><button disabled={adjustState.isLoading} className="inline-flex h-9 items-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white"><SlidersHorizontal className="h-4 w-4" />{adjustState.isLoading ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setModal(null)} className="h-9 rounded bg-slate-100 px-4 text-sm font-semibold dark:bg-slate-800">Close</button></div></form></section></div>}
  </div>;
}

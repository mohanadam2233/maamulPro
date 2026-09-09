import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, PenLine, Plus, Save, Trash2, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useCreateResourceMutation, useDeleteResourceMutation, useResourceListQuery, useUpdateResourceMutation } from '../store/api.js';

const today = () => new Date().toISOString().slice(0, 10);
const toMinor = (value) => Math.round(Number(value || 0) * 100);
const inputClass = 'h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

function SupplierForm({ supplier, onBack, onSaved }) {
  const editing = Boolean(supplier);
  const [form, setForm] = useState({
    name: supplier?.name || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    openingBalance: editing ? ((supplier.balanceMinor || 0) / 100).toFixed(2) : '0',
    openedAt: supplier?.openedAt ? String(supplier.openedAt).slice(0, 10) : today(),
  });
  const [message, setMessage] = useState('');
  const [createSupplier, createState] = useCreateResourceMutation();
  const [updateSupplier, updateState] = useUpdateResourceMutation();
  const saving = createState.isLoading || updateState.isLoading;

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), openedAt: form.openedAt };
      if (!editing) body.balanceMinor = toMinor(form.openingBalance);
      if (editing) await updateSupplier({ resource: 'vendors', id: supplier._id, body }).unwrap();
      else await createSupplier({ resource: 'vendors', body }).unwrap();
      onSaved(editing ? 'Supplier updated successfully.' : 'Supplier added successfully.');
    } catch (error) {
      setMessage(error.data?.error?.message || `Unable to ${editing ? 'update' : 'add'} supplier.`);
    }
  };

  return <div className="text-slate-800 dark:text-slate-100">
    <div className="mb-1 border-b-2 border-cyan-500 pb-2"><p className="text-xs text-slate-500 dark:text-slate-400">Preview</p><h1 className="mt-2 text-lg font-medium">{editing ? 'Edit supplier' : 'Add supplier'}</h1></div>
    <section className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <form onSubmit={submit}>
        <div className="grid gap-x-16 gap-y-4 p-5 lg:grid-cols-2">
          <label className="grid items-center gap-2 text-sm font-bold sm:grid-cols-[170px_1fr]"><span className="sm:text-right">Supplier Name <b className="text-red-500">*</b></span><input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="supplier name" className={inputClass} /></label>
          <label className="grid items-center gap-2 text-sm font-bold sm:grid-cols-[170px_1fr]"><span className="sm:text-right">Address <b className="text-red-500">*</b></span><input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Address" className={inputClass} /></label>
          <label className="grid items-center gap-2 text-sm font-bold sm:grid-cols-[170px_1fr]"><span className="sm:text-right">Phone <b className="text-red-500">*</b></span><input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="phone" className={inputClass} /></label>
          <label className="grid items-center gap-2 text-sm font-bold sm:grid-cols-[170px_1fr]"><span className="sm:text-right">Opening Balance <b className="text-red-500">*</b></span><input required={!editing} readOnly={editing} type="number" min="0" step="0.01" value={form.openingBalance} onChange={(event) => setForm({ ...form, openingBalance: event.target.value })} placeholder="0.00" className={inputClass} /></label>
          <label className="grid items-center gap-2 text-sm font-bold sm:grid-cols-[170px_1fr]"><span className="sm:text-right">Date <b className="text-red-500">*</b></span><input required type="date" value={form.openedAt} onChange={(event) => setForm({ ...form, openedAt: event.target.value })} className={inputClass} /></label>
        </div>
        {message && <div role="alert" className="mx-5 mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</div>}
        <footer className="flex justify-center gap-6 border-t border-slate-200 p-3 dark:border-slate-700"><button disabled={saving} className="inline-flex h-9 min-w-40 items-center justify-center gap-1 rounded bg-green-500 px-5 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</button><button type="button" onClick={onBack} className="inline-flex h-9 min-w-40 items-center justify-center gap-1 rounded bg-red-500 px-5 text-sm font-bold text-white hover:bg-red-600"><X className="h-4 w-4" />Close</button></footer>
      </form>
    </section>
  </div>;
}

export default function Vendors() {
  const role = useSelector((state) => state.auth.user?.role);
  const canManage = ['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STOREKEEPER'].includes(role);
  const canDelete = role === 'BUSINESS_ADMIN';
  const [mode, setMode] = useState('list');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [openAction, setOpenAction] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const { data, isLoading, isFetching, error } = useResourceListQuery({ resource: 'vendors', search, page, limit });
  const [deleteSupplier, { isLoading: deleting }] = useDeleteResourceMutation();
  const suppliers = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };
  const pages = Math.max(1, meta.pages || 1);

  if (mode === 'form') return <SupplierForm supplier={selected} onBack={() => { setSelected(null); setMode('list'); }} onSaved={(message) => { setNotice({ type: 'success', message }); setSelected(null); setPage(1); setMode('list'); }} />;

  const remove = async (supplier) => {
    setOpenAction('');
    if (!window.confirm(`Delete ${supplier.name}?`)) return;
    try {
      await deleteSupplier({ resource: 'vendors', id: supplier._id }).unwrap();
      setNotice({ type: 'success', message: 'Supplier deleted successfully.' });
    } catch (deleteError) {
      setNotice({ type: 'error', message: deleteError.data?.error?.message || 'Unable to delete supplier.' });
    }
  };

  return <div className="text-slate-800 dark:text-slate-100">
    <div className="mb-2 flex items-center justify-between border-b border-slate-300 pb-2"><div><p className="text-xs text-slate-500 dark:text-slate-400">View/Search Items Supplier</p><h1 className="mt-2 text-lg font-medium">Suppliers List</h1></div>{canManage && <button type="button" onClick={() => { setSelected(null); setNotice({ type: '', message: '' }); setMode('form'); }} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-bold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Add</button>}</div>
    <section className="border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {notice.message && <div role="status" className={`mb-2 rounded border px-3 py-2 text-sm font-semibold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.message}</div>}
      {error && <div role="alert" className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.data?.error?.message || 'Unable to load suppliers.'}</div>}
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm font-bold">Show<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="h-9 rounded border border-slate-300 bg-white px-2 dark:border-slate-600 dark:bg-slate-800"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select>entries</label><label className="flex items-center gap-2 text-sm font-bold">Search:<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className={`${inputClass} sm:w-52`} /></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="bg-[#247db8] text-white"><tr>{['#', 'Supplier Name', 'Phone', 'Address', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
        <tbody>{(isLoading || isFetching) ? <tr><td colSpan="5" className="border p-8 text-center">Loading…</td></tr> : suppliers.length ? suppliers.map((supplier, index) => <tr key={supplier._id} className="even:bg-stone-100 dark:even:bg-slate-800"><td className="border p-2 text-center">{(meta.page - 1) * limit + index + 1}</td><td className="border p-2 text-center">{supplier.name}</td><td className="border p-2 text-center">{supplier.phone || '—'}</td><td className="border p-2 text-center">{supplier.address || '—'}</td><td className="relative border p-2 text-center"><button type="button" onClick={() => setOpenAction(openAction === supplier._id ? '' : supplier._id)} className="inline-flex h-9 items-center gap-1 rounded bg-[#1f5c86] px-3 text-xs font-bold text-white">Action<ChevronDown className="h-3.5 w-3.5" /></button>{openAction === supplier._id && <div className="absolute right-2 top-12 z-20 min-w-32 rounded border border-slate-200 bg-white py-1 text-left shadow-xl dark:border-slate-600 dark:bg-slate-800">{canManage && <button type="button" onClick={() => { setSelected(supplier); setOpenAction(''); setMode('form'); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"><PenLine className="h-4 w-4 text-amber-500" />Edit</button>}{canDelete && <button type="button" disabled={deleting} onClick={() => remove(supplier)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="h-4 w-4" />Delete</button>}</div>}</td></tr>) : <tr><td colSpan="5" className="border p-8 text-center">No data available in table</td></tr>}</tbody>
      </table></div>
      <footer className="flex flex-col gap-3 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>Showing {suppliers.length ? (meta.page - 1) * limit + 1 : 0} to {Math.min(meta.page * limit, meta.total)} of {meta.total} entries</span><div className="flex items-center gap-2"><button type="button" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} className="grid h-8 w-8 place-items-center border disabled:opacity-40 dark:border-slate-600"><ChevronLeft className="h-4 w-4" /></button><span className="grid h-8 min-w-8 place-items-center border bg-slate-100 dark:border-slate-600 dark:bg-slate-800">{meta.page}</span><button type="button" disabled={meta.page >= pages} onClick={() => setPage(meta.page + 1)} className="grid h-8 w-8 place-items-center border disabled:opacity-40 dark:border-slate-600"><ChevronRight className="h-4 w-4" /></button></div></footer>
    </section>
  </div>;
}

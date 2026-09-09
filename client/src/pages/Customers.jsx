import { useDeferredValue, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, CircleDollarSign, Edit3, Mail,
  MapPin, Phone, Plus, Save, Search, Trash2, UserRound, X,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import {
  useCreateResourceMutation,
  useDeleteResourceMutation,
  useResourceListQuery,
  useUpdateResourceMutation,
} from '../store/api.js';

const emptyCustomer = {
  name: '', phone: '', address: '', email: '', oldBalance: '0', creditLimit: '0',
};

const inputClass = 'h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-950';
const money = (minor = 0) => `$${(Number(minor) / 100).toFixed(2)}`;
const dollarsToMinor = (value) => Math.round(Number(value || 0) * 100);

function Field({ label, icon: Icon, required, children, className = '' }) {
  return <label className={`block text-sm font-bold text-slate-700 dark:text-slate-200 ${className}`}>
    <span className="mb-2 flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-[#247db8]" />
      {label}{required && <b className="text-red-500">*</b>}
    </span>
    {children}
  </label>;
}

export default function Customers() {
  const role = useSelector((state) => state.auth.user?.role);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [notice, setNotice] = useState({ type: '', message: '' });

  const query = useMemo(
    () => ({ resource: 'customers', search: deferredSearch, page, limit }),
    [deferredSearch, page, limit],
  );
  const { data, isLoading, error } = useResourceListQuery(query);
  const [createCustomer, createState] = useCreateResourceMutation();
  const [updateCustomer, updateState] = useUpdateResourceMutation();
  const [deleteCustomer, deleteState] = useDeleteResourceMutation();

  const customers = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };
  const saving = createState.isLoading || updateState.isLoading;

  const openAdd = () => {
    setForm(emptyCustomer);
    setNotice({ type: '', message: '' });
    setModal({ customer: null });
  };

  const openEdit = (customer) => {
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      email: customer.email || '',
      oldBalance: (Number(customer.balanceMinor || 0) / 100).toFixed(2),
      creditLimit: (Number(customer.creditLimitMinor || 0) / 100).toFixed(2),
    });
    setNotice({ type: '', message: '' });
    setModal({ customer });
  };

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setNotice({ type: '', message: '' });
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      email: form.email.trim(),
      balanceMinor: dollarsToMinor(form.oldBalance),
      creditLimitMinor: dollarsToMinor(form.creditLimit),
    };

    if (body.balanceMinor > body.creditLimitMinor) {
      setNotice({ type: 'error', message: 'Old balance cannot be greater than the credit limit.' });
      return;
    }

    try {
      if (modal.customer) {
        await updateCustomer({ resource: 'customers', id: modal.customer._id, body }).unwrap();
      } else {
        await createCustomer({ resource: 'customers', body }).unwrap();
      }
      setModal(null);
      setNotice({ type: 'success', message: modal.customer ? 'Customer updated successfully.' : 'Customer added successfully.' });
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.data?.error?.message || 'Unable to save customer.' });
    }
  };

  const remove = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}?`)) return;
    try {
      await deleteCustomer({ resource: 'customers', id: customer._id }).unwrap();
      setNotice({ type: 'success', message: 'Customer deleted successfully.' });
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.data?.error?.message || 'Unable to delete customer.' });
    }
  };

  return <div className="text-slate-800 dark:text-slate-100">
    <div className="mb-4 flex items-center justify-between border-b-2 border-cyan-500 pb-4">
      <div>
        <h1 className="text-2xl font-medium">Customers</h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Home › Customers</p>
      </div>
      <button onClick={openAdd} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-bold text-white hover:bg-cyan-600">
        <Plus className="h-4 w-4" /> Add Customer
      </button>
    </div>

    <section className="border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {notice.message && <div role="alert" className={`mb-3 rounded border px-3 py-2 text-sm font-semibold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300'}`}>{notice.message}</div>}
      {error && <div role="alert" className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.data?.error?.message || 'Unable to load customers.'}</div>}

      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm">Show
          <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="h-9 rounded border border-slate-300 bg-white px-2 dark:border-slate-600 dark:bg-slate-800">
            <option value="10">10</option><option value="25">25</option><option value="50">50</option>
          </select> entries
        </label>
        <label className="flex items-center gap-2 text-sm font-bold"><Search className="h-4 w-4" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-9 w-full rounded border border-slate-300 bg-white px-3 font-normal outline-none focus:border-blue-500 sm:w-52 dark:border-slate-600 dark:bg-slate-800" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-[#247db8] text-white"><tr>
            {['#', 'Customer Name', 'Phone', 'Address', 'Old Balance', 'Credit Limit', 'Actions'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan="7" className="border p-10 text-center text-slate-500">Loading customers…</td></tr> : customers.length ? customers.map((customer, index) => <tr key={customer._id} className="odd:bg-white even:bg-stone-100 hover:bg-blue-50 dark:odd:bg-slate-900 dark:even:bg-slate-800/80 dark:hover:bg-slate-800">
              <td className="border border-slate-200 px-3 py-2.5 text-center dark:border-slate-700">{(meta.page - 1) * limit + index + 1}</td>
              <td className="border border-slate-200 px-3 py-2.5 text-center font-medium text-blue-600 dark:border-slate-700 dark:text-blue-400">{customer.name}</td>
              <td className="border border-slate-200 px-3 py-2.5 text-center dark:border-slate-700">{customer.phone || '—'}</td>
              <td className="border border-slate-200 px-3 py-2.5 text-center dark:border-slate-700">{customer.address || '—'}</td>
              <td className="border border-slate-200 px-3 py-2.5 text-center dark:border-slate-700">{money(customer.balanceMinor)}</td>
              <td className="border border-slate-200 px-3 py-2.5 text-center dark:border-slate-700">{money(customer.creditLimitMinor)}</td>
              <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                <div className="flex justify-center gap-1">
                  <button onClick={() => openEdit(customer)} aria-label={`Edit ${customer.name}`} className="grid h-8 w-8 place-items-center rounded bg-orange-400 text-white hover:bg-orange-500"><Edit3 className="h-4 w-4" /></button>
                  {role === 'BUSINESS_ADMIN' && <button disabled={deleteState.isLoading} onClick={() => remove(customer)} aria-label={`Delete ${customer.name}`} className="grid h-8 w-8 place-items-center rounded bg-red-500 text-white hover:bg-red-600"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </td>
            </tr>) : <tr><td colSpan="7" className="border p-10 text-center text-slate-500">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-3 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>Showing {customers.length ? (meta.page - 1) * limit + 1 : 0} to {Math.min(meta.page * limit, meta.total)} of {meta.total} entries</span>
        <div className="flex items-center gap-2">
          <button disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} className="grid h-8 w-8 place-items-center border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="border px-3 py-1.5">{meta.page}</span>
          <button disabled={meta.page >= meta.pages} onClick={() => setPage(meta.page + 1)} className="grid h-8 w-8 place-items-center border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </footer>
    </section>

    {modal && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/65 p-3" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
      <section className="w-full max-w-2xl overflow-hidden rounded bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex h-12 items-center justify-between bg-[#337fb5] px-4 text-white">
          <h2 className="flex items-center gap-2 text-sm font-bold"><UserRound className="h-4 w-4" />{modal.customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button type="button" onClick={closeModal} className="grid h-8 w-8 place-items-center rounded hover:bg-white/15"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <Field label="Customer Name" icon={UserRound} required className="sm:col-span-2"><input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
            <Field label="Phone" icon={Phone} className="sm:col-span-2"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass} /></Field>
            <Field label="Address" icon={MapPin} className="sm:col-span-2"><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className={inputClass} /></Field>
            <Field label="Email" icon={Mail} className="sm:col-span-2"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /></Field>
            <Field label="Old Balance ($)" icon={CircleDollarSign}><input type="number" min="0" step="0.01" value={form.oldBalance} onChange={(event) => setForm({ ...form, oldBalance: event.target.value })} className={inputClass} /></Field>
            <Field label="Credit Limit ($)" icon={CircleDollarSign}><input type="number" min="0" step="0.01" value={form.creditLimit} onChange={(event) => setForm({ ...form, creditLimit: event.target.value })} className={inputClass} /></Field>
            {notice.type === 'error' && <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 sm:col-span-2">{notice.message}</div>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
            <button type="button" onClick={closeModal} className="inline-flex h-9 items-center gap-1 rounded bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"><X className="h-4 w-4" />Cancel</button>
            <button disabled={saving} className="inline-flex h-9 items-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white hover:bg-[#286c9d] disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</button>
          </footer>
        </form>
      </section>
    </div>}
  </div>;
}

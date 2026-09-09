import { Save, Truck, X } from 'lucide-react';
import { useState } from 'react';
import { useCreateResourceMutation } from '../store/api.js';

const inputClass = 'mt-2 h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800';

export default function QuickSupplierModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [message, setMessage] = useState('');
  const [createSupplier, { isLoading }] = useCreateResourceMutation();

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const response = await createSupplier({ resource: 'vendors', body: form }).unwrap();
      onCreated(response.data);
    } catch (error) {
      setMessage(error.data?.error?.message || 'Unable to add supplier.');
    }
  };

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-3" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="w-full max-w-xl overflow-hidden rounded bg-white shadow-2xl dark:bg-slate-900">
      <header className="flex h-12 items-center justify-between bg-[#337fb5] px-4 text-white">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4" />Add Supplier</h2>
        <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
      </header>
      <form onSubmit={submit}>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <label className="text-sm font-bold sm:col-span-2">Supplier Name <b className="text-red-500">*</b><input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-bold">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-bold">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-bold sm:col-span-2">Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className={inputClass} /></label>
          {message && <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 sm:col-span-2">{message}</div>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1 rounded bg-slate-100 px-4 text-sm font-semibold dark:bg-slate-800"><X className="h-4 w-4" />Cancel</button>
          <button disabled={isLoading} className="inline-flex h-9 items-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{isLoading ? 'Saving…' : 'Save'}</button>
        </footer>
      </form>
    </section>
  </div>;
}

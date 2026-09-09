import './Settlement.css';
import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Printer, Save, Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useCreateResourceMutation, useResourceListQuery } from '../store/api.js';

const today = () => new Date().toISOString().slice(0, 10);
const money = (minor = 0) => `$${(Number(minor) / 100).toFixed(2)}`;
const toMinor = (value) => Math.round(Number(value || 0) * 100);
const inputClass = 'h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-950';
const categories = ['Rent', 'Utilities', 'Transport', 'Salary', 'Marketing', 'Maintenance', 'Office Supplies', 'Other'];

function AddExpense({ onBack, onSaved }) {
  const [form, setForm] = useState({ method: 'EVC Plus', paidAt: today(), category: '', amount: '', description: '' });
  const [notice, setNotice] = useState('');
  const [createExpense, { isLoading }] = useCreateResourceMutation();

  const submit = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    setNotice('');
    const amountMinor = toMinor(form.amount);
    if (form.category.trim().length < 2) return setNotice('Enter a valid expense category.');
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) return setNotice('Amount must be greater than zero.');
    if (form.description.trim().length < 2) return setNotice('Enter a short expense note.');

    try {
      await createExpense({
        resource: 'expenses',
        body: {
          category: form.category.trim(),
          description: form.description.trim(),
          amountMinor,
          currency: 'USD',
          method: form.method,
          paidAt: form.paidAt,
        },
      }).unwrap();
      onSaved('Expense saved successfully.');
    } catch (error) {
      setNotice(error.data?.error?.message || 'Unable to save expense.');
    }
  };

  return <div className="settlement-page text-slate-800 dark:text-slate-100">
    <div className="mb-1 flex items-center justify-between border-b border-slate-300 pb-2">
      <div><p className="text-xs text-slate-500 dark:text-slate-400">View / Search Expenses</p><h1 className="mt-2 text-lg font-medium">Expense List</h1></div>
      <button type="button" onClick={onBack} className="inline-flex h-9 items-center gap-1 rounded bg-red-500 px-3 text-sm font-bold text-white hover:bg-red-600"><ArrowLeft className="h-4 w-4" />Back</button>
    </div>

    <section className="border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <form onSubmit={submit}>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <select aria-label="Account" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })} className={inputClass}><option>EVC Plus</option><option>Cash</option><option>Bank</option><option>eDahab</option><option>Zaad</option></select>
          <input aria-label="Expense date" required type="date" value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} className={inputClass} />
          <input aria-label="Expense type search" list="expense-categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Raadi Nuuca" className={inputClass} />
          <datalist id="expense-categories">{categories.map((category) => <option value={category} key={category} />)}</datalist>
        </div>

        {notice && <div role="alert" className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{notice}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-[#337fb5] text-white"><tr>{['Expense Category', 'Amount', 'Note', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
            <tbody><tr>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><input required list="expense-categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Expense category" className={inputClass} /></td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" className={inputClass} /></td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><input required maxLength="500" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Expense note" className={inputClass} /></td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><button disabled={isLoading} className="inline-flex h-9 items-center gap-1 rounded bg-green-500 px-3 text-xs font-bold text-white hover:bg-green-600 disabled:opacity-60"><Save className="h-4 w-4" />{isLoading ? 'Saving…' : 'Save'}</button></td>
            </tr></tbody>
          </table>
        </div>
      </form>
    </section>
  </div>;
}

export default function Expenses() {
  const role = useSelector((state) => state.auth.user?.role);
  const canCreate = ['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STOREKEEPER'].includes(role);
  const [mode, setMode] = useState('list');
  const [filters, setFilters] = useState({ from: today(), to: today(), search: '' });
  const [query, setQuery] = useState({ from: today(), to: today(), search: '', page: 1, limit: 10 });
  const [notice, setNotice] = useState('');
  const { data, isLoading, isFetching, error } = useResourceListQuery({ resource: 'expenses', ...query });
  const expenses = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0, limit: query.limit };
  const pages = Math.max(1, meta.pages || 1);

  if (mode === 'add') return <AddExpense onBack={() => setMode('list')} onSaved={(message) => { setNotice(message); setQuery((current) => ({ ...current, page: 1 })); setMode('list'); }} />;

  const search = (event) => {
    event.preventDefault();
    setQuery((current) => ({ ...current, ...filters, page: 1 }));
  };

  return <div className="settlement-page text-slate-800 dark:text-slate-100">
    <div className="mb-2 flex flex-col gap-3 border-b border-slate-300 pb-2 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs text-slate-500 dark:text-slate-400">Home › Expense</p><h1 className="mt-2 text-lg font-medium">Expense List</h1></div>
      {canCreate && <button type="button" onClick={() => { setNotice(''); setMode('add'); }} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-3 text-sm font-bold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Add Expense</button>}
    </div>

    <section className="border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {notice && <div role="status" className="mb-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300">{notice}</div>}
      {error && <div role="alert" className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error.data?.error?.message || 'Unable to load expenses.'}</div>}

      <form onSubmit={search} className="mb-2 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <input aria-label="From date" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className={inputClass} />
        <input aria-label="To date" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className={inputClass} />
        <button className="inline-flex h-10 items-center justify-center gap-1 rounded bg-[#337fb5] px-4 text-sm font-bold text-white hover:bg-blue-700"><Search className="h-4 w-4" />Search</button>
      </form>

      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm">Show<select value={query.limit} onChange={(event) => setQuery((current) => ({ ...current, limit: Number(event.target.value), page: 1 }))} className="h-9 rounded border border-slate-300 bg-white px-2 dark:border-slate-600 dark:bg-slate-800"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select>entries</label>
        <label className="flex items-center gap-2 text-sm font-bold">Search:<input value={filters.search} onChange={(event) => { const value = event.target.value; setFilters({ ...filters, search: value }); setQuery((current) => ({ ...current, search: value, page: 1 })); }} className={`${inputClass} sm:w-52`} /></label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-sm">
          <thead className="bg-[#337fb5] text-white"><tr>{['Date', 'Expense Category', 'Account', 'Amount', 'Description', 'Action'].map((heading) => <th key={heading} className="border border-blue-400 px-2 py-2.5 text-left text-white">{heading}</th>)}</tr></thead>
          <tbody>
            {(isLoading || isFetching) && <tr><td colSpan="6" className="border border-slate-300 p-8 text-center dark:border-slate-700">Loading…</td></tr>}
            {!isLoading && !isFetching && !expenses.length && <tr><td colSpan="6" className="border border-slate-300 p-8 text-center dark:border-slate-700">No data available in table</td></tr>}
            {!isFetching && expenses.map((expense) => <tr key={expense._id} className="even:bg-stone-100 dark:even:bg-slate-800">
              <td className="border border-slate-300 p-2 dark:border-slate-700">{new Date(expense.paidAt || expense.createdAt).toLocaleDateString()}</td>
              <td className="border border-slate-300 p-2 dark:border-slate-700">{expense.category}</td>
              <td className="border border-slate-300 p-2 dark:border-slate-700">{expense.method}</td>
              <td className="border border-slate-300 p-2 font-semibold dark:border-slate-700">{money(expense.amountMinor)}</td>
              <td className="border border-slate-300 p-2 dark:border-slate-700">{expense.description}</td>
              <td className="border border-slate-300 p-2 dark:border-slate-700"><button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1 rounded bg-[#337fb5] px-3 text-xs font-bold text-white"><Printer className="h-3.5 w-3.5" />Print</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-3 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>Showing {expenses.length ? (meta.page - 1) * query.limit + 1 : 0} to {Math.min(meta.page * query.limit, meta.total)} of {meta.total} entries</span>
        <div className="flex items-center gap-2"><button type="button" disabled={meta.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} className="grid h-8 w-8 place-items-center border disabled:opacity-40 dark:border-slate-600"><ChevronLeft className="h-4 w-4" /></button><span>{meta.page}</span><button type="button" disabled={meta.page >= pages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} className="grid h-8 w-8 place-items-center border disabled:opacity-40 dark:border-slate-600"><ChevronRight className="h-4 w-4" /></button></div>
      </footer>
    </section>
  </div>;
}

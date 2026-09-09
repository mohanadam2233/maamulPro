import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useCreateResourceMutation, useResourceListQuery } from '../store/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';

const labels = { priceMinor: 'Price', costMinor: 'Cost', creditLimitMinor: 'Credit limit', balanceMinor: 'Balance', amountMinor: 'Amount', paidAt: 'Paid date' };
const format = (key, value) => key.toLowerCase().includes('minor') ? `$${((value || 0) / 100).toFixed(2)}` : key.endsWith('At') && value ? new Date(value).toLocaleDateString() : String(value ?? '—');

export default function ResourcePage({ resource, title, subtitle, fields, columns }) {
  const defaults = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ''])), [fields]);
  const [search, setSearch] = useState(''); const [open, setOpen] = useState(false); const [form, setForm] = useState(defaults); const [message, setMessage] = useState('');
  const { data, isLoading, error } = useResourceListQuery({ resource, search }); const [create, { isLoading: saving }] = useCreateResourceMutation();
  const submit = async (event) => {
    event.preventDefault(); setMessage('');
    const body = Object.fromEntries(fields.map((field) => {
      const value = form[field.key];
      if (field.moneyInput) return [field.key, Math.round(Number(value || 0) * 100)];
      return [field.key, field.type === 'number' ? Number(value || 0) : value];
    }));
    try { await create({ resource, body }).unwrap(); setOpen(false); setForm(defaults); }
    catch (err) { setMessage(err.data?.error?.message || 'Unable to save record'); }
  };
  return <><PageHeader title={title} subtitle={subtitle} action={<button className="primary" onClick={() => setOpen(true)}><Plus /> Add new</button>} />
    <section className="panel"><div className="toolbar"><div className="search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} /></div><span>{data?.meta?.total || 0} records</span></div>
      {error && <div className="alert error">{error.data?.error?.message || 'Unable to load records'}</div>}
      <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{labels[column] || column.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{isLoading ? <tr><td colSpan={columns.length}>Loading…</td></tr> : data?.data?.length ? data.data.map((item) => <tr key={item._id}>{columns.map((column) => <td key={column}>{format(column, item[column])}</td>)}</tr>) : <tr><td className="empty" colSpan={columns.length}>No records found.</td></tr>}</tbody></table></div>
    </section>
    {open && <Modal title={`Add ${title}`} onClose={() => setOpen(false)}><form className="form-grid" onSubmit={submit}>{fields.map((field) => <label key={field.key}>{field.label}<input type={field.type || 'text'} value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} required={['name', 'sku', 'category', 'description', 'amountMinor', 'priceMinor'].includes(field.key)} /></label>)}{message && <div className="form-error full">{message}</div>}<div className="modal-actions full"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save record'}</button></div></form></Modal>}
  </>;
}

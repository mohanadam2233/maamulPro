import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { usePosCatalogQuery, useTopCustomersQuery, useCreateResourceMutation, useUpdateResourceMutation, useDeleteResourceMutation } from '../store/api.js';
import './ContactDirectory.css';

const empty = { name: '', phone: '', address: '', email: '', credit: '0' };
const money = (value) => `$${(Number(value || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ContactDirectory({ resource, top = false }) {
  const vendor = resource === 'vendors';
  const role = useSelector((state) => state.auth.user?.role);
  const canEdit = !top && ['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STOREKEEPER'].includes(role);
  const canDelete = !top && role === 'BUSINESS_ADMIN';
  const list = usePosCatalogQuery(resource, { skip: top });
  const leaders = useTopCustomersQuery(undefined, { skip: !top });
  const query = top ? leaders : list;
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(vendor ? 10 : 25);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: '', direction: 1 });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [create, creating] = useCreateResourceMutation();
  const [update, updating] = useUpdateResourceMutation();
  const [remove, deleting] = useDeleteResourceMutation();
  const saving = creating.isLoading || updating.isLoading;
  const rows = useMemo(() => {
    const value = search.trim().toLowerCase();
    const all = (query.data?.data || []).map((item, i) => ({ ...item, ordinal: i + 1 }));
    const filtered = all.filter((item) => [item.name, item.phone, item.address].some((field) => String(field || '').toLowerCase().includes(value)));
    if (sort.key) filtered.sort((a, b) => {
      const left = a[sort.key] ?? '', right = b[sort.key] ?? '';
      return (typeof left === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true })) * sort.direction;
    });
    return filtered;
  }, [query.data, search, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / limit));
  const current = Math.min(page, pages);
  const start = (current - 1) * limit;
  const shown = rows.slice(start, start + limit);
  const headings = [['ordinal', top ? 'ID' : '#'], ['name', vendor ? 'Supplier Name' : 'Customer Name'], ['phone', 'Phone'], ['address', 'Address'], ...(!top && !vendor ? [['creditLimitMinor', 'Credit Limit']] : [])];
  const openForm = (item = {}) => {
    setForm({ name: item.name || '', phone: item.phone || '', address: item.address || '', email: item.email || '', credit: String(Number(item.creditLimitMinor || 0) / 100) });
    setMessage(''); setEditing(item);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setMessage('');
    const body = { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), email: form.email.trim() };
    if (body.name.length < 2) return setMessage('Name must contain at least two characters.');
    if (!vendor) {
      body.creditLimitMinor = Math.round(Number(form.credit) * 100);
      if (!Number.isSafeInteger(body.creditLimitMinor) || body.creditLimitMinor < 0) return setMessage('Enter a valid credit limit.');
    }
    try {
      if (editing._id) await update({ resource, id: editing._id, body }).unwrap();
      else await create({ resource, body }).unwrap();
      setEditing(null); setNotice('Record saved successfully.');
    } catch (error) { setMessage(error.data?.error?.message || 'Unable to save. Please try again.'); }
  };
  const confirmDelete = async () => {
    if (deleting.isLoading) return;
    try {
      await remove({ resource, id: removing._id }).unwrap();
      setRemoving(null); setNotice('Record removed from the active list.');
    } catch (error) { setMessage(error.data?.error?.message || 'Unable to delete. Please try again.'); }
  };
  const editButton = (item) => <button className="cd-edit" type="button" aria-label={`Edit ${item.name}`} onClick={() => openForm(item)}><Pencil size={13} /></button>;
  const deleteButton = (item) => <button className="cd-delete" type="button" aria-label={`Delete ${item.name}`} onClick={() => { setMessage(''); setRemoving(item); }}><Trash2 size={13} /></button>;
  return <div className="contact-directory">
    {top ? <><h1>Top 10 Customers List</h1><p className="cd-ranking">Ranked by all-time invoice value. Unnamed walk-in sales are excluded.</p></> : vendor ? <div className="cd-breadcrumb"><span>View/Search Items Supplier</span><span>Home › Supplier</span></div> : <div className="cd-heading">{canEdit && <button className="cd-add" onClick={() => openForm()}><Plus size={13} />Add Customer</button>}<Link to="/customers/top">Top 10 Customers</Link></div>}
    <section className="cd-panel">
      {vendor && <header className="cd-panel-heading"><span>Suppliers List</span>{canEdit && <button className="cd-add" onClick={() => openForm()}><Plus size={13} />Add</button>}</header>}
      {notice && <p role="status" className="cd-success">{notice}</p>}
      <div className="cd-toolbar"><label>Show <select aria-label="Rows per page" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>{[10,25,50,100].map((size) => <option key={size}>{size}</option>)}</select> entries</label><label className="cd-search"><Search size={14} /><input aria-label="Search contacts" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label></div>
      {query.isError && <p role="alert" className="cd-error">Unable to load records. <button onClick={query.refetch}>Retry</button></p>}
      <div className="cd-table-scroll"><table><thead><tr>{headings.map(([key, label]) => <th key={key} aria-sort={sort.key === key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => { setSort({ key, direction: sort.key === key ? -sort.direction : 1 }); setPage(1); }}>{label}<span aria-hidden="true">↕</span></button></th>)}{!top && <th>Actions</th>}</tr></thead><tbody>
        {query.isLoading || query.isError || !shown.length ? <tr><td colSpan={headings.length + (top ? 0 : 1)}>{query.isLoading ? 'Loading…' : query.isError ? 'Records unavailable.' : 'No records found.'}</td></tr> : shown.map((item) => <tr key={item._id}>
          <td>{item.ordinal}</td><td>{!vendor && !top && canEdit ? <button className="cd-name" onClick={() => openForm(item)}>{item.name}</button> : item.name}</td><td>{item.phone || '—'}</td><td>{item.address || '—'}</td>
          {!top && !vendor && <td>{money(item.creditLimitMinor)}</td>}
          {!top && <td>{vendor && (canEdit || canDelete) ? <details className="cd-actions"><summary>Action ▾</summary><div>{canEdit && editButton(item)}{canDelete && deleteButton(item)}</div></details> : <div className="cd-buttons">{canEdit && editButton(item)}{canDelete && deleteButton(item)}{!canEdit && !canDelete && '—'}</div>}</td>}
        </tr>)}
      </tbody></table></div>
      <footer className="cd-footer"><span>Showing {rows.length ? start + 1 : 0} to {Math.min(start + limit, rows.length)} of {rows.length} entries</span><nav aria-label="Pagination"><button disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button>{Array.from({length: pages}, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - current) < 2).map((n) => <button key={n} aria-current={n === current ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}<button disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button></nav></footer>
    </section>
    {editing && <Modal title={`${editing._id ? 'Edit' : 'Add'} ${vendor ? 'Supplier' : 'Customer'}`} onClose={() => !saving && setEditing(null)}><form className="form-grid" onSubmit={submit}>
      {[['name','Name'],['phone','Phone'],['address','Address'],['email','Email'],...(!vendor ? [['credit','Credit Limit ($)']] : [])].map(([key,label]) => <label key={key}>{label}<input required={key === 'name' || key === 'credit'} minLength={key === 'name' ? 2 : undefined} type={key === 'email' ? 'email' : key === 'credit' ? 'number' : 'text'} min={key === 'credit' ? 0 : undefined} step={key === 'credit' ? '0.01' : undefined} value={form[key]} onChange={(e) => setForm({...form,[key]:e.target.value})} /></label>)}
      {message && <p className="cd-error full" role="alert">{message}</p>}<div className="modal-actions full"><button className="secondary" type="button" disabled={saving} onClick={() => setEditing(null)}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
    </form></Modal>}
    {removing && <Modal title="Delete record" onClose={() => !deleting.isLoading && setRemoving(null)}><p>Remove {removing.name} from the active list? Existing transaction history will remain.</p>{message && <p role="alert" className="cd-error">{message}</p>}<div className="modal-actions"><button className="secondary" disabled={deleting.isLoading} onClick={() => setRemoving(null)}>Cancel</button><button className="primary" disabled={deleting.isLoading} onClick={confirmDelete}>{deleting.isLoading ? 'Deleting…' : 'Delete'}</button></div></Modal>}
  </div>;
}

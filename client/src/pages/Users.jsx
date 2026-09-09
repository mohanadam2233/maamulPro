import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCreateUserMutation, useUsersQuery } from '../store/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';

const initial = { name: '', username: '', email: '', password: '', role: 'CASHIER' };
export default function Users() {
  const { data, error } = useUsersQuery(); const [create, state] = useCreateUserMutation(); const [open, setOpen] = useState(false); const [form, setForm] = useState(initial); const [message, setMessage] = useState('');
  const submit = async (e) => { e.preventDefault(); try { await create(form).unwrap(); setOpen(false); setForm(initial); } catch (err) { setMessage(err.data?.error?.message || 'Unable to add user'); } };
  return <><PageHeader title="Users & Roles" subtitle="Manage access inside this business" action={<button className="primary" onClick={() => setOpen(true)}><Plus /> Add user</button>} /><section className="panel"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{data?.data?.map((user) => <tr key={user._id}><td>{user.name}</td><td>{user.username}</td><td>{user.email}</td><td>{user.role.replaceAll('_', ' ')}</td><td><span className={`status ${user.isActive ? 'paid' : 'unpaid'}`}>{user.isActive ? 'ACTIVE' : 'SUSPENDED'}</span></td></tr>)}{error && <tr><td colSpan="5">Only Business Admins can manage users.</td></tr>}</tbody></table></div></section>
    {open && <Modal title="Add user" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={submit}>{['name', 'username', 'email', 'password'].map((key) => <label key={key}>{key[0].toUpperCase() + key.slice(1)}<input type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required /></label>)}<label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'ACCOUNTANT', 'STOREKEEPER', 'AUDITOR'].map((r) => <option key={r}>{r}</option>)}</select></label>{message && <div className="form-error full">{message}</div>}<div className="modal-actions full"><button className="secondary" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary" disabled={state.isLoading}>Create user</button></div></form></Modal>}
  </>;
}

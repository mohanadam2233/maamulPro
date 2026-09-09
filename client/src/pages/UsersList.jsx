import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useCreateUserMutation, useUsersQuery, useChangeUserStatusMutation } from '../store/api.js';
import Modal from '../components/Modal.jsx';
import './ContactDirectory.css';
const roles=['BUSINESS_ADMIN','BRANCH_MANAGER','CASHIER','ACCOUNTANT','STOREKEEPER','AUDITOR'];
const initial={name:'',username:'',email:'',phone:'',password:'',role:'CASHIER'};
export default function UsersList(){
  const me=useSelector(s=>s.auth.user);
  const {data,error,isLoading}=useUsersQuery(undefined,{skip:me?.role!=='BUSINESS_ADMIN'});
  const [create,creating]=useCreateUserMutation(),[change,changing]=useChangeUserStatusMutation();
  const [form,setForm]=useState(initial),[open,setOpen]=useState(false),[permissions,setPermissions]=useState(false),[pending,setPending]=useState(null);
  const [search,setSearch]=useState(''),[page,setPage]=useState(1),[limit,setLimit]=useState(10),[notice,setNotice]=useState(''),[message,setMessage]=useState('');
  const [sort,setSort]=useState({key:'username',direction:1});
  const rows=(data?.data||[]).filter(u=>[u.name,u.username,u.email,u.phone,u.role].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>String(a[sort.key]||'').localeCompare(String(b[sort.key]||''))*sort.direction);
  const pages=Math.max(1,Math.ceil(rows.length/limit)),current=Math.min(page,pages),offset=(current-1)*limit;
  const submit=async e=>{e.preventDefault();if(creating.isLoading)return;setMessage('');try{await create(form).unwrap();setOpen(false);setForm(initial);setNotice('User created successfully.');}catch(err){setMessage(err.data?.error?.message||'Unable to create user.');}};
  const saveStatus=async()=>{if(changing.isLoading)return;try{await change({id:pending._id,isActive:!pending.isActive}).unwrap();setPending(null);setNotice('User status updated.');}catch(err){setMessage(err.data?.error?.message||'Unable to change status.');}};
  if(me?.role!=='BUSINESS_ADMIN')return <p role="alert">Only Business Admins can manage users.</p>;
  return <div className="contact-directory">
    <div className="cd-breadcrumb"><span>View/Search Users</span><span>Home › Users</span></div>
    <section className="cd-panel"><header className="cd-panel-heading"><span>Users List</span><div className="cd-buttons"><button className="cd-add" onClick={()=>setPermissions(true)}>Permissions</button><button className="cd-add" onClick={()=>{setMessage('');setOpen(true);}}>+ Add Users</button></div></header>
      {notice&&<p role="status" className="cd-success">{notice}</p>}{error&&<p role="alert" className="cd-error">Unable to load users.</p>}
      <div className="cd-toolbar"><label>Show <select value={limit} onChange={e=>{setLimit(Number(e.target.value));setPage(1);}}>{[10,25,50].map(n=><option key={n}>{n}</option>)}</select> entries</label><label className="cd-search">Search: <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label></div>
      <div className="cd-table-scroll"><table><thead><tr>{[['username','Username'],['email','Email'],['phone','Phone'],['role','Type']].map(([key,label])=><th key={key} aria-sort={sort.key===key?sort.direction===1?'ascending':'descending':'none'}><button onClick={()=>setSort({key,direction:sort.key===key?-sort.direction:1})}>{label}<span aria-hidden="true">↕</span></button></th>)}<th>Status</th><th>Action</th></tr></thead><tbody>
        {isLoading?<tr><td colSpan="6">Loading…</td></tr>:rows.slice(offset,offset+limit).map(u=><tr key={u._id}><td>{u.username}</td><td>{u.email}</td><td>{u.phone||'—'}</td><td>{u.role.replaceAll('_',' ')}</td><td><span className={`status ${u.isActive?'paid':'unpaid'}`}>{u.isActive?'Active':'Suspended'}</span></td><td><details className="cd-actions"><summary>Manage ▾</summary><div><button disabled={u._id===(me._id||me.id)} title={u._id===(me._id||me.id)?'You cannot change your own status':undefined} onClick={()=>{setMessage('');setPending(u);}}>{u.isActive?'Suspend':'Activate'}</button></div></details></td></tr>)}{!isLoading&&!rows.length&&<tr><td colSpan="6">No users found.</td></tr>}
      </tbody></table></div>
      <footer className="cd-footer"><span>Showing {rows.length?offset+1:0} to {Math.min(offset+limit,rows.length)} of {rows.length} entries</span><nav aria-label="Pagination"><button disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><button aria-current="page">{current}</button><button disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></nav></footer>
    </section>
    {open&&<Modal title="Add user" onClose={()=>!creating.isLoading&&setOpen(false)}><form className="form-grid" onSubmit={submit}>{['name','username','email','phone','password'].map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)}<input type={key==='password'?'password':key==='email'?'email':'text'} minLength={key==='password'?8:key==='username'?3:key==='name'?2:undefined} maxLength={key==='phone'?40:undefined} required={key!=='phone'} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}<label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(role=><option key={role}>{role}</option>)}</select></label>{message&&<p role="alert" className="cd-error full">{message}</p>}<div className="modal-actions full"><button type="button" className="secondary" disabled={creating.isLoading} onClick={()=>setOpen(false)}>Cancel</button><button className="primary" disabled={creating.isLoading}>{creating.isLoading?'Saving…':'Create user'}</button></div></form></Modal>}
    {pending&&<Modal title={pending.isActive?'Suspend user':'Activate user'} onClose={()=>!changing.isLoading&&setPending(null)}><p>{pending.isActive?'Suspend':'Activate'} {pending.username}?</p>{message&&<p role="alert" className="cd-error">{message}</p>}<div className="modal-actions"><button className="secondary" disabled={changing.isLoading} onClick={()=>setPending(null)}>Cancel</button><button className="primary" disabled={changing.isLoading} onClick={saveStatus}>Confirm</button></div></Modal>}
    {permissions&&<Modal title="User roles" onClose={()=>setPermissions(false)}><p>Access is controlled by the role assigned when creating a user.</p><ul>{roles.map(role=><li key={role}>{role.replaceAll('_',' ')}</li>)}</ul><p>Only Business Admins can create users and change their active status.</p></Modal>}
  </div>;
}

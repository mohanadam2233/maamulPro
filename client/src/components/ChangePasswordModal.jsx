import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Save } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useChangePasswordMutation } from '../store/api.js';
import { setCredentials } from '../store/authSlice.js';
import Modal from './Modal.jsx';

const copy = {
  en: { title: 'Change password', help: 'Use at least 8 characters. Changing your password also invalidates older refresh sessions.', current: 'Current password', next: 'New password', confirm: 'Confirm new password', mismatch: 'New passwords do not match.', same: 'Choose a password different from your current password.', success: 'Password changed successfully.', error: 'Could not change your password.', cancel: 'Cancel', change: 'Change password', changing: 'Changing…', show: 'Show password', hide: 'Hide password' },
  so: { title: 'Beddel erayga sirta', help: 'Isticmaal ugu yaraan 8 xaraf. Beddelidda erayga sirta waxay xiraysaa fadhiyadii hore.', current: 'Erayga sirta ee hadda', next: 'Erayga sirta cusub', confirm: 'Xaqiiji erayga sirta cusub', mismatch: 'Labada eray ee sirta cusub isma laha.', same: 'Dooro eray sir ah oo ka duwan kii hore.', success: 'Erayga sirta si guul leh ayaa loo beddelay.', error: 'Erayga sirta lama beddeli karin.', cancel: 'Ka noqo', change: 'Beddel erayga sirta', changing: 'Waa la beddelayaa…', show: 'Muuji erayga sirta', hide: 'Qari erayga sirta' },
};

function PasswordField({ label, value, onChange, autoComplete, showLabel, hideLabel }) {
  const [visible, setVisible] = useState(false);
  return <label className="grid min-w-0 gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">{label}<span className="flex h-11 min-w-0 items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-500 dark:border-slate-600 dark:bg-slate-800"><input className="min-w-0 flex-1 border-0 bg-transparent outline-none" type={visible ? 'text' : 'password'} value={value} onChange={onChange} minLength="8" maxLength="128" autoComplete={autoComplete} required /><button type="button" onClick={() => setVisible((current) => !current)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={visible ? hideLabel : showLabel}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>;
}

export default function ChangePasswordModal({ language = 'en', onClose }) {
  const t = copy[language] || copy.en;
  const dispatch = useDispatch();
  const [changePassword, changeState] = useChangePasswordMutation();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (changeState.isLoading) return;
    if (form.newPassword !== form.confirmPassword) return setMessage({ type: 'error', text: t.mismatch });
    if (form.currentPassword === form.newPassword) return setMessage({ type: 'error', text: t.same });
    setMessage(null);
    try {
      const response = await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }).unwrap();
      dispatch(setCredentials(response.data));
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: t.success });
    } catch (error) {
      setMessage({ type: 'error', text: error.data?.error?.message || t.error });
    }
  };

  return <Modal title={t.title} onClose={onClose}>
    <form onSubmit={submit} className="min-w-0 p-4 sm:p-6">
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"><KeyRound className="h-5 w-5 shrink-0" /><p className="m-0 leading-5">{t.help}</p></div>
      <div className="grid min-w-0 gap-4"><PasswordField label={t.current} value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} autoComplete="current-password" showLabel={t.show} hideLabel={t.hide} /><PasswordField label={t.next} value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} autoComplete="new-password" showLabel={t.show} hideLabel={t.hide} /><PasswordField label={t.confirm} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} autoComplete="new-password" showLabel={t.show} hideLabel={t.hide} /></div>
      {message && <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`} role="status">{message.text}</div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700"><button type="button" className="secondary" onClick={onClose}>{t.cancel}</button><button className="primary" disabled={changeState.isLoading}><Save /> {changeState.isLoading ? t.changing : t.change}</button></div>
    </form>
  </Modal>;
}

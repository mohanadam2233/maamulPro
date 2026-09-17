import { useRef, useState } from 'react';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useUpdateProfileMutation } from '../store/api.js';
import { updateCurrentUser } from '../store/authSlice.js';
import Modal from './Modal.jsx';
import UserAvatar from './UserAvatar.jsx';

const MAX_SOURCE_SIZE = 5 * 1024 * 1024;
const IMAGE_SIZE = 192;
const copy = {
  en: { title: 'Edit profile', photo: 'Profile photo', photoHelp: 'JPEG, PNG or WebP. Maximum 5 MB.', choose: 'Choose photo', remove: 'Remove', name: 'Full name', username: 'Username', email: 'Email address', phone: 'Phone number', success: 'Profile updated successfully.', error: 'Could not update your profile.', cancel: 'Cancel', save: 'Save profile', saving: 'Saving…' },
  so: { title: 'Wax ka beddel xogta', photo: 'Sawirka profile-ka', photoHelp: 'JPEG, PNG ama WebP. Ugu badnaan 5 MB.', choose: 'Dooro sawir', remove: 'Ka saar', name: 'Magaca oo buuxa', username: 'Magaca isticmaalaha', email: 'Cinwaanka email-ka', phone: 'Lambarka telefoonka', success: 'Xogtaada si guul leh ayaa loo cusbooneysiiyey.', error: 'Xogtaada lama cusbooneysiin karin.', cancel: 'Ka noqo', save: 'Kaydi xogta', saving: 'Waa la kaydinayaa…' },
};

function resizeProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('Select a JPEG, PNG or WebP image.'));
    if (file.size > MAX_SOURCE_SIZE) return reject(new Error('The selected image must be smaller than 5 MB.'));

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = IMAGE_SIZE;
      canvas.height = IMAGE_SIZE;
      const context = canvas.getContext('2d');
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - cropSize) / 2;
      const sourceY = (image.naturalHeight - cropSize) / 2;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
      context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.84));
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('The selected image could not be opened.')); };
    image.src = objectUrl;
  });
}

export default function ProfileModal({ user, language = 'en', onClose }) {
  const t = copy[language] || copy.en;
  const dispatch = useDispatch();
  const fileInput = useRef(null);
  const [updateProfile, updateState] = useUpdateProfileMutation();
  const [form, setForm] = useState({
    name: user.name || '', username: user.username || '', email: user.email || '',
    phone: user.phone || '', avatarDataUrl: user.avatarDataUrl || '',
  });
  const [message, setMessage] = useState(null);
  const previewUser = { ...user, name: form.name, avatarDataUrl: form.avatarDataUrl };

  const selectImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    try {
      const avatarDataUrl = await resizeProfileImage(file);
      setForm((current) => ({ ...current, avatarDataUrl }));
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
  };

  const save = async (event) => {
    event.preventDefault();
    if (updateState.isLoading) return;
    setMessage(null);
    try {
      const response = await updateProfile(form).unwrap();
      dispatch(updateCurrentUser(response.data));
      setMessage({ type: 'success', text: t.success });
    } catch (error) {
      setMessage({ type: 'error', text: error.data?.error?.message || t.error });
    }
  };

  return <Modal title={t.title} onClose={onClose}>
    <form onSubmit={save} className="min-w-0 p-4 sm:p-6">
      <div className="flex min-w-0 flex-col items-center gap-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:flex-row sm:p-5 dark:from-slate-800 dark:to-slate-800/60">
        <UserAvatar user={previewUser} className="!h-20 !w-20 !shrink-0 border-4 border-white text-2xl shadow-lg sm:!h-24 sm:!w-24 dark:border-slate-700" />
        <div className="min-w-0 text-center sm:text-left"><h3 className="font-extrabold text-slate-900 dark:text-white">{t.photo}</h3><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t.photoHelp}</p><div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start"><button type="button" onClick={() => fileInput.current?.click()} className="secondary !min-h-9 !px-3 !text-xs"><ImagePlus className="h-4 w-4" /> {t.choose}</button>{form.avatarDataUrl && <button type="button" onClick={() => setForm({ ...form, avatarDataUrl: '' })} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700"><Trash2 className="h-4 w-4" /> {t.remove}</button>}</div><input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} /></div>
      </div>
      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">{t.name}<input className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} minLength="2" maxLength="80" required /></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">{t.username}<input className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 lowercase outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })} pattern="[a-z0-9._-]+" minLength="3" maxLength="40" required /></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">{t.email}<input className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength="120" required /></label>
        <label className="grid min-w-0 gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">{t.phone}<input className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength="30" placeholder="+252 61 0000000" /></label>
      </div>
      {message && <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`} role="status">{message.text}</div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700"><button type="button" className="secondary" onClick={onClose}>{t.cancel}</button><button className="primary" disabled={updateState.isLoading}><Save /> {updateState.isLoading ? t.saving : t.save}</button></div>
    </form>
  </Modal>;
}

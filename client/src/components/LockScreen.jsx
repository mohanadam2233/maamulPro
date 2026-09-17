import { Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useVerifyPasswordMutation } from '../store/api.js';
import UserAvatar from './UserAvatar.jsx';

const copy = {
  en: {
    locked: 'Screen locked', message: 'Enter your password to continue.', password: 'Password',
    placeholder: 'Enter your password', unlock: 'Unlock', unlocking: 'Unlocking…', logout: 'Log out',
    wrong: 'The password is incorrect.', show: 'Show password', hide: 'Hide password', protected: 'Your MaamulPro session is protected.',
  },
  so: {
    locked: 'Shaashaddu way qufulan tahay', message: 'Geli eraygaaga sirta ah si aad u sii waddo.', password: 'Erayga sirta ah',
    placeholder: 'Geli erayga sirta ah', unlock: 'Fur', unlocking: 'Waa la furayaa…', logout: 'Ka bax',
    wrong: 'Erayga sirta ah waa khalad.', show: 'Muuji erayga sirta', hide: 'Qari erayga sirta', protected: 'Fadhigaaga MaamulPro waa la ilaaliyey.',
  },
};

export default function LockScreen({ user, language = 'en', onUnlock, onLogout }) {
  const t = copy[language] || copy.en;
  const inputRef = useRef(null);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [verifyPassword, verifyState] = useVerifyPasswordMutation();

  useEffect(() => inputRef.current?.focus(), []);

  const unlock = async (event) => {
    event.preventDefault();
    if (verifyState.isLoading) return;
    setError('');
    try {
      await verifyPassword({ password }).unwrap();
      setPassword('');
      onUnlock();
    } catch (requestError) {
      setPassword('');
      setError(requestError.data?.error?.message || t.wrong);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return <div className="fixed inset-0 z-[300] grid min-h-screen place-items-center overflow-y-auto  p-4">
    <section className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:bg-slate-900">
      <div className="h-2 bg-gradient-to-r " />
      <div className="p-6 text-center sm:p-8">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-black tracking-wide text-slate-900 dark:text-white"><ShieldCheck className="h-7 w-7 text-blue-600" />MAAMUL<span className="text-blue-600">PRO</span></div>
        <UserAvatar user={user} className="mx-auto !h-20 !w-20 border-4 border-blue-100 text-2xl shadow-lg dark:border-slate-700" />
        <h1 className="mb-1 mt-4 text-xl font-extrabold text-slate-900 dark:text-white">{user.name}</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
        <div className="mb-5 rounded-2xl bg-blue-50 p-4 text-left dark:bg-blue-950/40"><div className="flex items-center gap-2 font-extrabold text-blue-800 dark:text-blue-200"><LockKeyhole className="h-5 w-5" />{t.locked}</div><p className="mb-0 mt-1 text-sm text-blue-700 dark:text-blue-300">{t.message}</p></div>
        <form onSubmit={unlock} className="text-left">
          <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">{t.password}<span className="flex h-12 items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:ring-blue-950"><input ref={inputRef} type={visible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent outline-none" placeholder={t.placeholder} autoComplete="current-password" minLength="6" required /><button type="button" onClick={() => setVisible((value) => !value)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={visible ? t.hide : t.show}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
          {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <button disabled={verifyState.isLoading} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 font-extrabold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-violet-700 disabled:opacity-60"><LockKeyhole className="h-4 w-4" />{verifyState.isLoading ? t.unlocking : t.unlock}</button>
        </form>
        <button type="button" onClick={onLogout} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"><LogOut className="h-4 w-4" />{t.logout}</button>
        <p className="mb-0 mt-6 text-xs text-slate-400">{t.protected}</p>
      </div>
    </section>
  </div>;
}

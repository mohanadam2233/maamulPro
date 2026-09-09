import { useState } from 'react';
import { AlertCircle, BarChart3, Boxes, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UsersRound } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api.js';
import { setCredentials } from '../store/authSlice.js';

export default function Login() {
  const [form, setForm] = useState({ login: '', password: '', remember: false });
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [login, { isLoading }] = useLoginMutation();
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch(); const navigate = useNavigate();
  if (user) return <Navigate to={user.role === 'SUPER_ADMIN' ? '/platform' : '/'} replace />;
  const submit = async (event) => {
    event.preventDefault();
    if (isLoading || notice.type === 'success') return;
    setNotice({ type: '', message: '' });
    try {
      const response = await login({ login: form.login.trim(), password: form.password }).unwrap();
      setNotice({ type: 'success', message: `Welcome back, ${response.data.user.name}. Login successful.` });
      await new Promise((resolve) => setTimeout(resolve, 650));
      dispatch(setCredentials(response.data)); navigate(response.data.user.role === 'SUPER_ADMIN' ? '/platform' : '/');
    } catch (error) {
      const message = error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR'
        ? 'Cannot connect to the server. Check your connection and try again.'
        : error.status === 429 ? 'Too many sign-in attempts. Please wait a moment and try again.'
        : error.status === 401 ? 'Email, username or password is incorrect. Please try again.'
        : Number(error.status) >= 500 ? 'The server is temporarily unavailable. Please try again shortly.'
        : error.data?.error?.message || 'Unable to sign in. Please check your details and try again.';
      setNotice({ type: 'error', message });
    }
  };
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-blue-950 via-indigo-950 to-violet-950 p-4 text-slate-900 sm:p-8">
    <div className="pointer-events-none absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-blue-500/20 blur-[110px]" />
    <div className="pointer-events-none absolute -bottom-48 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/15 blur-[120px]" />
    <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-blue-950/40 lg:min-h-[620px] lg:grid-cols-[1.05fr_.95fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -bottom-32 -right-28 h-96 w-96 rounded-full border border-blue-300/20 shadow-[0_0_0_55px_rgba(59,130,246,.06),0_0_0_110px_rgba(99,102,241,.04)]" />
        <div className="relative flex items-center gap-3 text-lg font-extrabold tracking-wider"><ShieldCheck className="h-8 w-8" /><span>MAAMUL<span className="text-cyan-200">PRO</span></span></div>
        <div className="relative mt-24"><span className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">Business management, simplified</span><h2 className="mt-4 max-w-md text-4xl font-extrabold leading-tight tracking-tight text-white">Everything your business needs in one place.</h2><p className="mt-5 max-w-md text-base leading-7 text-slate-200">Manage sales, inventory, customers, finance and subscriptions through one secure workspace.</p></div>
        <div className="relative mt-10 space-y-5">
          {[[BarChart3, 'Live insights', 'Track business performance clearly.'], [Boxes, 'Stock control', 'Keep products and purchases organized.'], [UsersRound, 'Team access', 'Give every user the correct role.']].map(([Icon, title, description]) => <div className="flex items-center gap-4" key={title}><Icon className="h-11 w-11 shrink-0 rounded-xl border border-blue-300/25 bg-blue-400/10 p-2.5 text-cyan-200" /><span><b className="block text-sm font-bold text-white">{title}</b><small className="mt-1 block text-xs font-medium leading-5 text-slate-300">{description}</small></span></div>)}
        </div>
        <small className="relative mt-auto text-xs font-medium text-slate-300">Secure • Simple • Built for growing businesses</small>
      </aside>

      <section className="flex flex-col justify-center bg-white px-6 py-10 sm:px-12 lg:px-14" aria-labelledby="login-title">
        <div className="mb-9 flex items-center gap-2.5 text-base font-extrabold tracking-wider text-slate-900 lg:hidden"><ShieldCheck className="h-7 w-7 text-blue-600" /><span>MAAMUL<span className="text-blue-600">PRO</span></span></div>
        <div><span className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-600">Account access</span><h1 id="login-title" className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in to open your MaamulPro dashboard.</p></div>

        {notice.message && <div className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`} role={notice.type === 'success' ? 'status' : 'alert'} aria-live={notice.type === 'success' ? 'polite' : 'assertive'} aria-atomic="true">{notice.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}<span><strong className="mb-1 block">{notice.type === 'success' ? 'Signed in successfully' : 'Sign-in failed'}</strong><span className="block font-normal leading-5">{notice.message}</span></span></div>}

        <form className="mt-6" onSubmit={submit}>
          <label className="mb-2 block text-xs font-bold text-slate-700">Email or username</label>
          <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100"><Mail className="h-5 w-5 shrink-0 text-blue-500" /><input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="Enter email or username" autoComplete="username" required /></div>

          <label className="mb-2 mt-5 block text-xs font-bold text-slate-700">Password</label>
          <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100"><LockKeyhole className="h-5 w-5 shrink-0 text-blue-500" /><input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type={show ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required /><button type="button" className="grid h-9 w-9 place-items-center rounded-lg bg-slate-200 text-slate-500 transition hover:bg-slate-300" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>

          <div className="my-5 flex items-center justify-between gap-3 text-xs"><label className="flex items-center gap-2 text-slate-600"><input className="h-4 w-4 accent-blue-600" type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} /> Remember me</label><button type="button" className="font-bold text-blue-600 hover:text-blue-700">Forgot password?</button></div>
          <button className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading || notice.type === 'success'}>{isLoading ? 'Signing in…' : notice.type === 'success' ? 'Redirecting…' : 'Sign in'}</button>
        </form>
        <small className="mt-7 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400"><ShieldCheck className="h-4 w-4" /> Your account is protected by secure authentication</small>
      </section>
    </section>
  </main>;
}

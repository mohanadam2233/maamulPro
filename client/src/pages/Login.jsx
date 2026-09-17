import { useState } from 'react';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Package,
  ReceiptText,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api.js';
import { setCredentials } from '../store/authSlice.js';

export default function Login() {
  const [form, setForm] = useState({
    login: '',
    password: '',
    remember: false,
  });

  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState({
    type: '',
    message: '',
  });

  const [login, { isLoading }] = useLoginMutation();
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (user) {
    return (
      <Navigate
        to={user.role === 'SUPER_ADMIN' ? '/platform' : '/'}
        replace
      />
    );
  }

  const submit = async (event) => {
    event.preventDefault();

    if (isLoading || notice.type === 'success') return;

    setNotice({ type: '', message: '' });

    try {
      const response = await login({
        login: form.login.trim(),
        password: form.password,
      }).unwrap();

      setNotice({
        type: 'success',
        message: `Welcome back, ${response.data.user.name}. Login successful.`,
      });

      await new Promise((resolve) => setTimeout(resolve, 650));

      dispatch(setCredentials(response.data));

      navigate(
        response.data.user.role === 'SUPER_ADMIN'
          ? '/platform'
          : '/',
      );
    } catch (error) {
      const message =
        error.status === 'FETCH_ERROR' ||
        error.status === 'TIMEOUT_ERROR'
          ? 'Cannot connect to the server. Check your connection and try again.'
          : error.status === 429
            ? 'Too many sign-in attempts. Please wait and try again.'
            : error.status === 401
              ? 'Email, username or password is incorrect.'
              : Number(error.status) >= 500
                ? 'The server is temporarily unavailable.'
                : error.data?.error?.message ||
                  'Unable to sign in. Check your details and try again.';

      setNotice({
        type: 'error',
        message,
      });
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f6f8] p-3 text-slate-900 sm:p-6 lg:grid lg:place-items-center">
      <section className="mx-auto grid min-h-[calc(100vh-24px)] w-full max-w-[1360px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.08)] lg:min-h-[650px] lg:grid-cols-2">

        {/* Login form */}
        <section
          className="flex min-w-0 flex-col justify-center bg-white px-6 py-10 sm:px-12 lg:px-14 xl:px-16"
          aria-labelledby="login-title"
        >
          <div className="mb-12 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
              <ShieldCheck className="h-7 w-7" />
            </span>

            <span>
              <b className="block text-xl font-black tracking-wide">
                MAAMUL <span className="text-cyan-600">PRO</span>
              </b>

              <small className="mt-1 block text-xs text-slate-400">
                Smart, secure and user-friendly ERP & POS
              </small>
            </span>
          </div>

          <div>
            <h1
              id="login-title"
              className="text-3xl font-extrabold tracking-tight text-slate-950"
            >
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to manage sales, inventory and reports.
            </p>
          </div>

        {notice.message && (
  <div
    className={`fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-2xl sm:right-6 sm:top-6 ${
      notice.type === 'success'
        ? 'border-emerald-200 bg-white text-emerald-700 shadow-emerald-900/10'
        : 'border-red-200 bg-white text-red-700 shadow-red-900/10'
    }`}
    role={notice.type === 'success' ? 'status' : 'alert'}
    aria-live={notice.type === 'success' ? 'polite' : 'assertive'}
  >
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
        notice.type === 'success'
          ? 'bg-emerald-100 text-emerald-600'
          : 'bg-red-100 text-red-600'
      }`}
    >
      {notice.type === 'success' ? (
        <CheckCircle2 className="h-6 w-6" />
      ) : (
        <AlertCircle className="h-6 w-6" />
      )}
    </span>

    <div className="min-w-0 flex-1">
      <strong className="block text-sm font-extrabold text-slate-900">
        {notice.type === 'success'
          ? 'Login successful'
          : 'Login failed'}
      </strong>

      <p className="mt-1 text-xs leading-5 text-slate-600">
        {notice.message}
      </p>
    </div>
  </div>
)}

          <form className="mt-7" onSubmit={submit}>
            <label className="mb-2 block text-xs font-bold text-slate-700">
              Email or Username
            </label>

            <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
              <Mail className="h-5 w-5 shrink-0 text-slate-400" />

              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                value={form.login}
                onChange={(event) =>
                  setForm({
                    ...form,
                    login: event.target.value,
                  })
                }
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </div>

            <label className="mb-2 mt-5 block text-xs font-bold text-slate-700">
              Password
            </label>

            <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
              <LockKeyhole className="h-5 w-5 shrink-0 text-slate-400" />

              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                value={form.password}
                onChange={(event) =>
                  setForm({
                    ...form,
                    password: event.target.value,
                  })
                }
                type={show ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="my-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 text-xs">
  <label className="flex items-center gap-2 text-slate-600">
    <input
      className="h-4 w-4 accent-cyan-600"
      type="checkbox"
      checked={form.remember}
      onChange={(event) =>
        setForm({
          ...form,
          remember: event.target.checked,
        })
      }
    />

    Remember me
  </label>

  <button
    type="button"
    className="ml-auto shrink-0 font-bold text-slate-600 hover:text-blue-700"
  >
    Forgot password?
  </button>
</div>

            <button
              className="flex h-14 w-full items-center justify-center rounded-xl bg-linear-to-r from-[#2788c7] to-[#292563] text-sm font-extrabold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading || notice.type === 'success'}
            >
              {isLoading
                ? 'Signing in…'
                : notice.type === 'success'
                  ? 'Redirecting…'
                  : 'Sign in'}
            </button>
          </form>

          <small className="mt-8 block w-full px-2 text-center text-[11px] leading-5 text-slate-400">
  Powered by <b className="text-slate-500">MAAMULPRO</b>

  <span className="hidden sm:inline">
    {' '}— Fast, Easy and Smart ERP & POS
  </span>
</small>
        </section>

        {/* Right information panel */}
        <aside className="relative hidden overflow-hidden border-l border-slate-200 bg-[#eaf2f8] p-10 lg:flex lg:flex-col xl:p-14">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">
            Speedy, Easy and Fast
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
            MaamulPro is a modern business management and POS system.
            Manage sales, inventory, purchases, accounts and reports
            in one platform.
          </p>

          <div className="relative mt-10 flex flex-1 items-center justify-center">
            <div className="absolute left-[8%] top-[12%] w-28 rounded-xl border border-sky-300 bg-white/45 p-4 text-center text-sky-700 shadow-sm">
              <LayoutDashboard className="mx-auto h-6 w-6" />
              <b className="mt-2 block text-xs">Dashboard</b>
              <strong className="mt-2 block text-xl">65%</strong>
            </div>

            <div className="absolute right-[8%] top-[12%] w-28 rounded-xl border border-sky-300 bg-white/45 p-4 text-center text-sky-700 shadow-sm">
              <ReceiptText className="mx-auto h-6 w-6" />
              <b className="mt-2 block text-xs">Invoice List</b>
              <small className="mt-2 block">#104 · #107</small>
            </div>

            <div className="absolute bottom-[23%] left-[14%] w-24 rounded-xl border border-sky-300 bg-white/45 p-3 text-center text-sky-700 shadow-sm">
              <Package className="mx-auto h-7 w-7" />
              <b className="mt-1 block text-xs">Inventory</b>
            </div>

            <div className="absolute bottom-[23%] right-[14%] w-24 rounded-xl border border-sky-300 bg-white/45 p-3 text-center text-sky-700 shadow-sm">
              <CreditCard className="mx-auto h-7 w-7" />
              <b className="mt-1 block text-xs">Payment</b>
            </div>

            <div className="relative text-center">
              <Boxes className="mx-auto h-20 w-20 text-cyan-400/70" />

              <div className="mt-3 text-6xl font-black leading-[.82] tracking-tight text-cyan-300/70">
                MAAMUL
                <br />
                PRO
              </div>
            </div>

            <div className="absolute bottom-[6%] h-20 w-[72%] -skew-x-12 rounded-[50%] border border-sky-500/40 bg-gradient-to-b from-sky-700 to-slate-950 shadow-[0_25px_45px_rgba(2,132,199,.28)]">
              <div className="mx-auto mt-4 grid w-3/4 grid-cols-6 gap-2 opacity-45">
                {Array.from({ length: 18 }).map((_, index) => (
                  <i
                    key={index}
                    className="h-1 rounded bg-cyan-300"
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
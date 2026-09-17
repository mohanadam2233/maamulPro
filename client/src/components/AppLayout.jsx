import { useEffect, useRef, useState } from 'react';
import {
  Boxes, ChevronDown, FileBarChart, HandCoins, KeyRound,
  Languages, LayoutDashboard, LockKeyhole, LogOut, Menu, Moon, PackageSearch,
  PlusSquare, ReceiptText, ShieldCheck, ShoppingCart, Sun, UserRound, Users,
  WalletCards, X,Settings
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useLogoutMutation } from '../store/api.js';
import { clearCredentials } from '../store/authSlice.js';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import LockScreen from './LockScreen.jsx';
import ProfileModal from './ProfileModal.jsx';
import { Notifications, WhatsAppButton } from './TopbarTools.jsx';
import UserAvatar from './UserAvatar.jsx';

const links = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard },
  { to: '/sales', key: 'sales', icon: ReceiptText },
  { to: '/products', key: 'stock', icon: Boxes },
  { to: '/customers', key: 'customers', icon: Users },
  { to: '/purchases', key: 'purchases', icon: ShoppingCart },
  { to: '/vendors', key: 'vendors', icon: ShoppingCart },
  { to: '/expenses', key: 'finance', icon: WalletCards },
  { to: '/payments', key: 'payments', icon: HandCoins, roles: ['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR'] },
  { to: '/receipts', key: 'receipts', icon: ReceiptText, roles: ['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR'] },
  { to: '/reports', key: 'reports', icon: FileBarChart },
  { to: '/users', key: 'users', icon: PackageSearch },
];

const copy = {
  en: {
    dashboard: 'Dashboard', sales: 'Sales', stock: 'Stock Management', customers: 'Customers',
    purchases: 'Purchases', vendors: 'Vendors', finance: 'Finance & Accounts', payments: 'Payments',
    receipts: 'Receipts', reports: 'Reports', users: 'Users', subscription: 'Subscription',
    platform: 'Platform Control', online: 'Online', editProfile: 'Edit profile',
    changePassword: 'Change password', lockScreen: 'Lock screen', language: 'Language', logout: 'Log out',
  },
  so: {
    dashboard: 'Guddiga', sales: 'Iibka', stock: 'Maamulka Kaydka', customers: 'Macaamiisha',
    purchases: 'Iibsiyada', vendors: 'Alaab-qeybiyeyaasha', finance: 'Maaliyadda & Xisaabaadka', payments: 'Lacag-bixinnada',
    receipts: 'Rasiidhada', reports: 'Warbixinnada', users: 'Isticmaalayaasha', subscription: 'Rukunka',
    platform: 'Maamulka Platform-ka', online: 'Khadka ku jira', editProfile: 'Wax ka beddel xogta',
    changePassword: 'Beddel erayga sirta', lockScreen: 'Quful shaashadda', language: 'Luuqadda', logout: 'Ka bax',
  },
};

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('maamulpro-sidebar-collapsed') === 'true');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('maamulpro-theme') === 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('maamulpro-language') === 'so' ? 'so' : 'en');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [locked, setLocked] = useState(() => sessionStorage.getItem('maamulpro-locked') === 'true');
  const userMenuRef = useRef(null);
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const t = copy[language];

  const exit = async () => {
    try { await logout().unwrap(); } catch {}
    sessionStorage.removeItem('maamulpro-locked');
    dispatch(clearCredentials());
    navigate('/login');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('maamulpro-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('maamulpro-language', language);
  }, [language]);

  useEffect(() => {
    const close = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      setMobileOpen((value) => !value);
      return;
    }
    setCollapsed((value) => {
      localStorage.setItem('maamulpro-sidebar-collapsed', String(!value));
      return !value;
    });
  };

  const openProfile = () => { setUserMenuOpen(false); setProfileOpen(true); };
  const openPassword = () => { setUserMenuOpen(false); setPasswordOpen(true); };
  const lockScreen = () => {
    setUserMenuOpen(false);
    sessionStorage.setItem('maamulpro-locked', 'true');
    setLocked(true);
  };
  const unlockScreen = () => {
    sessionStorage.removeItem('maamulpro-locked');
    setLocked(false);
  };

  if (locked) return <LockScreen user={user} language={language} onUnlock={unlockScreen} onLogout={exit} />;

  return <div className={`shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <header className="topbar">
      <button className="menu-btn" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>{mobileOpen ? <X /> : <Menu />}</button>
      <div className="top-brand"><ShieldCheck /> MAAMUL<b>PRO</b></div>
      <div className="top-actions">
        <button onClick={() => navigate('/pos')}><PlusSquare /> <span>POS</span></button>
        <WhatsAppButton />
        <Notifications />
        <button className="theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} title={darkMode ? 'Light mode' : 'Dark mode'}>{darkMode ? <Sun /> : <Moon />}</button>
        <div className="user-menu" ref={userMenuRef}>
          <button className="user-menu-trigger" onClick={() => setUserMenuOpen((value) => !value)} aria-expanded={userMenuOpen}>
            <UserAvatar user={user} />
            <span className="user-summary"><b>{user.name}</b><small>{user.role.replaceAll('_', ' ')}</small></span>
            <ChevronDown className={userMenuOpen ? 'rotated' : ''} />
          </button>
          {userMenuOpen && <div className="user-dropdown !p-0">
            <div className="dropdown-identity !m-0 !rounded-none border-b border-slate-200 p-4 dark:border-slate-700">
              <UserAvatar user={user} large />
              <div><b>{user.name}</b><span>{user.email}</span><small>{user.role.replaceAll('_', ' ')}</small></div>
            </div>
            <div className="grid gap-1 p-2">
              <button type="button" onClick={openProfile} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-cyan-300"><UserRound className="h-4 w-4" />{t.editProfile}</button>
              <button type="button" onClick={openPassword} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-cyan-300"><KeyRound className="h-4 w-4" />{t.changePassword}</button>
              <button type="button" onClick={lockScreen} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-cyan-300"><LockKeyhole className="h-4 w-4" />{t.lockScreen}</button>
            </div>
            <div className="border-y border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400"><Languages className="h-4 w-4 text-cyan-500" />{t.language}</div>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setLanguage('en')} className={`h-9 rounded-lg border text-xs font-extrabold ${language === 'en' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}>English</button><button type="button" onClick={() => setLanguage('so')} className={`h-9 rounded-lg border text-xs font-extrabold ${language === 'so' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}>Soomaali</button></div>
            </div>
            <button type="button" onClick={exit}><LogOut className="h-4 w-4" />{t.logout}</button>
          </div>}
        </div>
      </div>
    </header>

    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="profile"><UserAvatar user={user} large /><div className="profile-details"><b>{user.name}</b><span><i /> {t.online}</span></div></div>
      <nav>{user.role === 'SUPER_ADMIN'
        ? <NavLink to="/platform" onClick={() => setMobileOpen(false)} title={t.platform}><ShieldCheck /><span>{t.platform}</span></NavLink>
        : links.filter(({ roles }) => !roles || roles.includes(user.role)).map(({ to, key, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)} title={t[key]}><Icon /><span>{t[key]}</span></NavLink>)}</nav>
        <div className="mt-auto border-t border-slate-700/70 p-3">
  <button
    type="button"
    onClick={openProfile}
    className={`mb-1 flex min-h-11 w-full items-center rounded-lg px-3 text-[13px] text-slate-300 transition hover:bg-slate-800 hover:text-white ${
      collapsed && !mobileOpen ? 'justify-center' : 'gap-3'
    }`}
  >
    <Settings className="h-[19px] w-[19px] shrink-0 text-blue-300" />

    <span className={collapsed && !mobileOpen ? 'hidden' : ''}>
      {language === 'so' ? 'Dejimaha' : 'Settings'}
    </span>
  </button>

  <button
    type="button"
    onClick={exit}
    className={`flex min-h-11 w-full items-center rounded-lg px-3 text-[13px] text-slate-300 transition hover:bg-red-500/10 hover:text-red-200 ${
      collapsed && !mobileOpen ? 'justify-center' : 'gap-3'
    }`}
  >
    <LogOut className="h-[19px] w-[19px] shrink-0 text-red-300" />

    <span className={collapsed && !mobileOpen ? 'hidden' : ''}>
      {language === 'so' ? 'Ka bax' : 'Log out'}
    </span>
  </button>
</div>
    </aside>

    {mobileOpen && <button className="overlay" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
    <main className="content"><Outlet /></main>
    {profileOpen && <ProfileModal user={user} language={language} onClose={() => setProfileOpen(false)} />}
    {passwordOpen && <ChangePasswordModal language={language} onClose={() => setPasswordOpen(false)} />}
  </div>;
}

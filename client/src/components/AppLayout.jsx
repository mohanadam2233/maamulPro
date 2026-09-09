import { useEffect, useRef, useState } from 'react';
import { Bell, Boxes, ChevronDown, CircleDollarSign, FileBarChart, HandCoins, LayoutDashboard, LogOut, Menu, Moon, PackageSearch, PlusSquare, ReceiptText, ShieldCheck, ShoppingCart, Sun, Users, WalletCards, X } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useLogoutMutation } from '../store/api.js';
import { WhatsAppButton, Notifications } from './TopbarTools.jsx';
import { clearCredentials } from '../store/authSlice.js';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard }, { to: '/sales', label: 'Sales', icon: ReceiptText },
  { to: '/products', label: 'Stock Management', icon: Boxes }, { to: '/customers', label: 'Customers', icon: Users },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart }, { to: '/vendors', label: 'Vendors', icon: ShoppingCart }, { to: '/expenses', label: 'Finance & Accounts', icon: WalletCards },
  { to: '/payments', label: 'Payments', icon: HandCoins, roles: ['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR'] },
  { to: '/receipts', label: 'Receipts', icon: ReceiptText, roles: ['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart }, { to: '/users', label: 'Users', icon: PackageSearch },
  { to: '/billing', label: 'Subscription', icon: CircleDollarSign },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('maamulpro-sidebar-collapsed') === 'true');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('maamulpro-theme') === 'dark');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [logout] = useLogoutMutation(); const navigate = useNavigate(); const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const exit = async () => { try { await logout().unwrap(); } catch {} dispatch(clearCredentials()); navigate('/login'); };
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('maamulpro-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  useEffect(() => {
    const close = (event) => { if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenuOpen(false); };
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
  const closeMobileMenu = () => setMobileOpen(false);
  return <div className={`shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <header className="topbar"><button className="menu-btn" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>{mobileOpen ? <X /> : <Menu />}</button><div className="top-brand"><ShieldCheck /> MAAMUL<b>PRO</b></div><div className="top-actions"><button onClick={() => navigate('/pos')}><PlusSquare /> <span>POS</span></button><WhatsAppButton /><Notifications /><button onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} title={darkMode ? 'Light mode' : 'Dark mode'}>{darkMode ? <Sun /> : <Moon />}</button><div className="user-menu" ref={userMenuRef}><button className="user-menu-trigger" onClick={() => setUserMenuOpen((value) => !value)} aria-expanded={userMenuOpen}><div className="avatar">{user.name.slice(0, 1)}</div><span className="user-summary"><b>{user.name}</b><small>{user.role.replaceAll('_', ' ')}</small></span><ChevronDown className={userMenuOpen ? 'rotated' : ''} /></button>{userMenuOpen && <div className="user-dropdown"><div className="dropdown-identity"><div className="avatar large">{user.name.slice(0, 1)}</div><div><b>{user.name}</b><span>{user.email}</span><small>{user.role.replaceAll('_', ' ')}</small></div></div><button onClick={exit}><LogOut /> Log out</button></div>}</div></div></header>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="profile"><div className="avatar large">{user.name.slice(0, 1)}</div><div className="profile-details"><b>{user.name}</b><span><i /> Online</span></div></div>
      <nav>{user.role === 'SUPER_ADMIN' ? <NavLink to="/platform" onClick={closeMobileMenu} title="Platform Control"><ShieldCheck /><span>Platform Control</span></NavLink> : links.filter(({ roles }) => !roles || roles.includes(user.role)).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={closeMobileMenu} title={label}><Icon /><span>{label}</span></NavLink>)}</nav>
    </aside>
    {mobileOpen && <button className="overlay" onClick={closeMobileMenu} aria-label="Close menu" />}
    <main className="content"><Outlet /></main>
  </div>;
}

import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useRefreshMutation } from './store/api.js';
import { markInitialized, setCredentials } from './store/authSlice.js';
import AppLayout from './components/AppLayout.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ResourcePage = lazy(() => import('./pages/ResourcePage.jsx'));
const Sales = lazy(() => import('./pages/Sales.jsx'));
const Purchases = lazy(() => import('./pages/Purchases.jsx'));
const Users = lazy(() => import('./pages/UsersList.jsx'));
const Platform = lazy(() => import('./pages/Platform.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));
const Pos = lazy(() => import('./pages/Pos.jsx'));
const Receipts = lazy(() => import('./pages/Receipts.jsx'));
const Payments = lazy(() => import('./pages/Payments.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const ContactDirectory = lazy(() => import('./pages/ContactDirectory.jsx'));

const configs = {
  customers: { title: 'Customers', subtitle: 'Customer directory and credit limits', fields: [
    { key: 'name', label: 'Customer name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email', type: 'email' },
    { key: 'address', label: 'Address' }, { key: 'creditLimitMinor', label: 'Credit limit (cents)', type: 'number' },
  ], columns: ['name', 'phone', 'email', 'creditLimitMinor'] },
  vendors: { title: 'Vendors', subtitle: 'Supplier contacts and balances', fields: [
    { key: 'name', label: 'Vendor name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'address', label: 'Address' },
  ], columns: ['name', 'phone', 'email', 'balanceMinor'] },
  expenses: { title: 'Finance & Expenses', subtitle: 'Record and review business spending', fields: [
    { key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'amountMinor', label: 'Amount (cents)', type: 'number' },
    { key: 'currency', label: 'Currency', defaultValue: 'USD' }, { key: 'method', label: 'Payment method', defaultValue: 'Cash' },
  ], columns: ['category', 'description', 'amountMinor', 'method', 'paidAt'] },
};

function Protected({ children, superOnly = false }) {
  const { user, initialized } = useSelector((state) => state.auth);
  if (!initialized) return <div className="app-loader"><span /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (superOnly && user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />;
  return children;
}

function ProtectedLayout() {
  const { user, initialized } = useSelector((state) => state.auth);
  if (!initialized) return <div className="app-loader"><span /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

export default function App() {
  const dispatch = useDispatch();
  const { accessToken, initialized } = useSelector((state) => state.auth);
  const [refresh] = useRefreshMutation();
  const refreshStarted = useRef(false);
  useEffect(() => {
    if (initialized || accessToken || refreshStarted.current) return;
    refreshStarted.current = true;
    refresh().unwrap()
      .then((response) => response?.data ? dispatch(setCredentials(response.data)) : dispatch(markInitialized()))
      .catch(() => dispatch(markInitialized()));
  }, [accessToken, dispatch, initialized, refresh]);

  return <Suspense fallback={<div className="app-loader"><span /></div>}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/pos" element={<Protected><Pos /></Protected>} />
    <Route element={<ProtectedLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="sales" element={<Sales />} />
      <Route path="receipts" element={<Receipts />} />
      <Route path="payments" element={<Payments />} />
      <Route path="expenses" element={<Expenses />} />
      <Route path="purchases" element={<Purchases />} />
      <Route path="products" element={<Inventory />} />
      <Route path="customers" element={<ContactDirectory key="customers" resource="customers" />} />
      <Route path="vendors" element={<ContactDirectory key="vendors" resource="vendors" />} />
      <Route path="customers/top" element={<ContactDirectory key="top" resource="customers" top />} />
      <Route path="users" element={<Users />} />
      <Route path="reports" element={<Reports />} />
      <Route path="platform" element={<Protected superOnly><Platform /></Protected>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>;
}

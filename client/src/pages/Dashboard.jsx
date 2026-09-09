import { Boxes, CircleDollarSign, FileText, PackageCheck, Receipt, ShoppingCart, Truck, UserRound, UsersRound, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { useDashboardQuery } from '../store/api.js';
import PageHeader from '../components/PageHeader.jsx';

const money = (value = 0) => `$${(value / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const cards = [
  ['dailyInvoice', 'Daily Invoice', FileText, 'blue', true, '/sales'], ['customers', 'Customers', UsersRound, 'violet', false, '/customers'], ['purchaseToday', 'Purchase Today', ShoppingCart, 'emerald', true, '/purchases'],
  ['inventory', 'Inventory', Boxes, 'indigo', false, '/products'], ['paymentToday', 'Payment Today', CircleDollarSign, 'cyan', true, '/payments'], ['allExpense', 'All Expense', WalletCards, 'rose', true, '/expenses'],
  ['allInvoice', 'All Invoice', Receipt, 'sky', false, '/sales'], ['vendors', 'Vendors', Truck, 'purple', false, '/vendors'], ['topCustomers', 'Top Customers', UserRound, 'teal', false, '/customers/top'],
  ['receiptToday', 'Receipt Today', PackageCheck, 'green', true, '/receipts'], ['expenseToday', 'Expense Today', WalletCards, 'amber', true, '/expenses'], ['users', 'Users', UsersRound, 'fuchsia', false, '/users'],
];
const chartColors = ['#16a34a', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { data, isLoading, error } = useDashboardQuery(); const result = data?.data;
  return <><PageHeader title="Business Dashboard" subtitle="Live overview of sales, stock, customers and expenses" /><div className="dashboard-frame">
    {error && <div className="alert error">{error.data?.error?.message || 'Dashboard could not be loaded.'}</div>}
    <section className="metrics">{cards.map(([key, label, Icon, color, isMoney, to]) => <Link className={`metric ${color}`} key={key} to={to} aria-label={`Open ${label}`}><div className="metric-icon"><Icon /></div><div><span>{label}</span><strong>{isLoading ? '—' : isMoney ? money(result?.metrics?.[key]) : (result?.metrics?.[key] || 0).toLocaleString()}</strong></div></Link>)}</section>
    <section className="charts">
      <article className="chart-card"><h2>Sales This Month</h2><div className="chart-box"><ResponsiveContainer><PieChart><Pie data={result?.salesStatus || []} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="78%" paddingAngle={2}>{(result?.salesStatus || []).map((entry, index) => <Cell key={entry.name} fill={chartColors[index]} />)}</Pie><Tooltip formatter={money} /></PieChart></ResponsiveContainer></div><div className="legend"><span className="paid">Paid</span><span className="partial">Partial</span><span className="unpaid">Unpaid</span></div></article>
      <article className="chart-card"><h2>Vendor This Month</h2><div className="chart-box"><ResponsiveContainer><BarChart data={result?.vendorSummary || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={money} /><Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
      <article className="chart-card"><h2>Expenses — Last 3 Months</h2><div className="chart-box"><ResponsiveContainer><BarChart data={result?.expenseTrend || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={money} /><Bar dataKey="value" fill="#e11d48" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
    </section>
    <section className="recent"><h2>Recent invoices</h2>{result?.recentSales?.length ? <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody>{result.recentSales.map((sale) => <tr key={sale._id}><td>{sale.invoiceNumber}</td><td>{sale.customerId?.name || 'Walk-in customer'}</td><td><span className={`status ${sale.status.toLowerCase()}`}>{sale.status}</span></td><td>{money(sale.totalMinor)}</td><td>{new Date(sale.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="empty">No invoices yet. Create the first sale from POS.</p>}</section>
  </div></>;
}

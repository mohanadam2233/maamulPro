import { Boxes, CircleDollarSign, FileText, PackageCheck, Receipt, ShoppingCart, Truck, UserRound, UsersRound, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link, useOutletContext } from 'react-router-dom';
import { useDashboardQuery } from '../store/api.js';
import PageHeader from '../components/PageHeader.jsx';

const money = (value = 0) => `$${(value / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const cards = [
  ['dailyInvoice', 'dailyInvoice', FileText, 'green', true, '/sales'],
  ['customers', 'customers', UsersRound, 'blue', false, '/customers'],
  ['purchaseToday', 'purchaseToday', ShoppingCart, 'yellow', true, '/purchases'],
  ['inventory', 'inventory', Boxes, 'purple', false, '/products'],
  ['paymentToday', 'paymentToday', CircleDollarSign, 'red', true, '/payments'],
  ['allExpense', 'allExpense', WalletCards, 'pink', true, '/expenses'],

  ['allInvoice', 'allInvoice', Receipt, 'cyan', false, '/sales'],
  ['vendors', 'vendors', Truck, 'violet', false, '/vendors'],
  ['topCustomers', 'topCustomers', UserRound, 'green', false, '/customers/top'],
  ['receiptToday', 'receiptToday', PackageCheck, 'purple', true, '/receipts'],
  ['expenseToday', 'expenseToday', WalletCards, 'pink', true, '/expenses'],
  ['users', 'users', UsersRound, 'cyan', false, '/users'],
];
const chartColors = ['#0f766e', '#d97706', '#dc2626'];
const copy = {
  en: {
    title: 'Business Dashboard', subtitle: 'Live overview of sales, stock, customers and expenses',
    dailyInvoice: 'Daily Invoice', customers: 'Customers', purchaseToday: 'Purchase Today', inventory: 'Inventory',
    paymentToday: 'Payment Today', allExpense: 'All Expense', allInvoice: 'All Invoice', vendors: 'Vendors',
    topCustomers: 'Top Customers', receiptToday: 'Receipt Today', expenseToday: 'Expense Today', users: 'Users',
    salesMonth: 'Sales This Month', vendorMonth: 'Vendor This Month', expensesThree: 'Expenses — Last 3 Months',
    recent: 'Recent invoices', invoice: 'Invoice', customer: 'Customer', status: 'Status', total: 'Total', date: 'Date',
    paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid', walkIn: 'Walk-in customer', empty: 'No invoices yet. Create the first sale from POS.',
    loadError: 'Dashboard could not be loaded.', open: 'Open',
  },
  so: {
    title: 'Guddiga Ganacsiga', subtitle: 'Muuqaal toos ah oo ku saabsan iibka, kaydka, macaamiisha iyo kharashaadka',
    dailyInvoice: 'Qaansheegta Maanta', customers: 'Macaamiisha', purchaseToday: 'Iibsiga Maanta', inventory: 'Kaydka Alaabta',
    paymentToday: 'Lacag-bixinta Maanta', allExpense: 'Dhammaan Kharashaadka', allInvoice: 'Dhammaan Qaansheegyada', vendors: 'Alaab-qeybiyeyaasha',
    topCustomers: 'Macaamiisha Ugu Sarreeya', receiptToday: 'Rasiidhka Maanta', expenseToday: 'Kharashka Maanta', users: 'Isticmaalayaasha',
    salesMonth: 'Iibka Bishan', vendorMonth: 'Iibsiga Alaab-qeybiyeyaasha Bishan', expensesThree: 'Kharashaadka — 3-dii Bilood ee Dambe',
    recent: 'Qaansheegyadii Ugu Dambeeyey', invoice: 'Qaansheeg', customer: 'Macmiil', status: 'Xaalad', total: 'Wadarta', date: 'Taariikh',
    paid: 'La bixiyey', partial: 'Qayb ayaa la bixiyey', unpaid: 'Lama bixin', walkIn: 'Macmiil toos ah', empty: 'Weli qaansheeg ma jiro. Iibka ugu horreeya ka samee POS.',
    loadError: 'Guddiga ganacsiga lama soo dejin karin.', open: 'Fur',
  },
};

export default function Dashboard() {
  const { language = 'en' } = useOutletContext() || {};
  const t = copy[language] || copy.en;
  const { data, isLoading, error } = useDashboardQuery();
  const result = data?.data;
  const statusLabel = (value) => ({ PAID: t.paid, Paid: t.paid, PARTIAL: t.partial, Partial: t.partial, UNPAID: t.unpaid, Unpaid: t.unpaid }[value] || value);
  const salesStatus = (result?.salesStatus || []).map((entry) => ({ ...entry, name: statusLabel(entry.name) }));
  const vendorSummary = (result?.vendorSummary || []).map((entry) => ({ ...entry, name: statusLabel(entry.name) }));

  return <>
    <PageHeader title={t.title} subtitle={t.subtitle} />
    <div className="dashboard-frame">
      {error && <div className="alert error">{error.data?.error?.message || t.loadError}</div>}
      <section className="metrics">{cards.map(([key, labelKey, Icon, color, isMoney, to]) => <Link className={`metric ${color}`} key={key} to={to} aria-label={`${t.open} ${t[labelKey]}`}><div className="metric-icon"><Icon /></div><div><span>{t[labelKey]}</span><strong>{isLoading ? '—' : isMoney ? money(result?.metrics?.[key]) : (result?.metrics?.[key] || 0).toLocaleString()}</strong></div></Link>)}</section>
      <section className="charts">
        <article className="chart-card"><h2>{t.salesMonth}</h2><div className="chart-box"><ResponsiveContainer><PieChart><Pie data={salesStatus} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="78%" paddingAngle={2}>{salesStatus.map((entry, index) => <Cell key={entry.name} fill={chartColors[index]} />)}</Pie><Tooltip formatter={money} /></PieChart></ResponsiveContainer></div><div className="legend"><span className="paid">{t.paid}</span><span className="partial">{t.partial}</span><span className="unpaid">{t.unpaid}</span></div></article>
        <article className="chart-card"><h2>{t.vendorMonth}</h2><div className="chart-box"><ResponsiveContainer><BarChart data={vendorSummary}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={money} /><Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
        <article className="chart-card"><h2>{t.expensesThree}</h2><div className="chart-box"><ResponsiveContainer><BarChart data={result?.expenseTrend || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={money} /><Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
      </section>
      <section className="recent"><h2>{t.recent}</h2>{result?.recentSales?.length ? <div className="table-wrap"><table><thead><tr><th>{t.invoice}</th><th>{t.customer}</th><th>{t.status}</th><th>{t.total}</th><th>{t.date}</th></tr></thead><tbody>{result.recentSales.map((sale) => <tr key={sale._id}><td>{sale.invoiceNumber}</td><td>{sale.customerId?.name || t.walkIn}</td><td><span className={`status ${sale.status.toLowerCase()}`}>{statusLabel(sale.status)}</span></td><td>{money(sale.totalMinor)}</td><td>{new Date(sale.createdAt).toLocaleDateString(language === 'so' ? 'so-SO' : 'en-US')}</td></tr>)}</tbody></table></div> : <p className="empty">{t.empty}</p>}</section>
    </div>
  </>;
}

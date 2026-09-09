import { Download, FileBarChart } from 'lucide-react';
import { usePurchasesQuery, useResourceListQuery, useSalesQuery } from '../store/api.js';
import PageHeader from '../components/PageHeader.jsx';

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export default function Reports() {
  const { data: sales } = useSalesQuery(); const { data: purchases } = usePurchasesQuery();
  const { data: products } = useResourceListQuery({ resource: 'products' }); const { data: expenses } = useResourceListQuery({ resource: 'expenses' });
  const reports = [
    { name: 'Sales report', note: 'Invoices, payment status and collected amounts.', count: sales?.data?.length || 0, run: () => downloadCsv('maamulpro-sales.csv', (sales?.data || []).map((x) => ({ invoice: x.invoiceNumber, status: x.status, total: x.totalMinor / 100, paid: x.paidMinor / 100, date: x.createdAt }))) },
    { name: 'Purchases report', note: 'Supplier purchases, status and balances.', count: purchases?.data?.length || 0, run: () => downloadCsv('maamulpro-purchases.csv', (purchases?.data || []).map((x) => ({ purchase: x.purchaseNumber, vendor: x.vendorId?.name, status: x.status, total: x.totalMinor / 100, paid: x.paidMinor / 100, date: x.createdAt }))) },
    { name: 'Stock on hand', note: 'Current quantity, cost and stock value.', count: products?.data?.length || 0, run: () => downloadCsv('maamulpro-stock.csv', (products?.data || []).map((x) => ({ sku: x.sku, product: x.name, category: x.category, stock: x.stock, cost: x.costMinor / 100, price: x.priceMinor / 100, stockValue: x.stock * x.costMinor / 100 }))) },
    { name: 'Expense report', note: 'Recorded spending by category and method.', count: expenses?.data?.length || 0, run: () => downloadCsv('maamulpro-expenses.csv', (expenses?.data || []).map((x) => ({ category: x.category, description: x.description, amount: x.amountMinor / 100, method: x.method, date: x.paidAt }))) },
  ];
  return <><PageHeader title="Reports" subtitle="Export tenant-scoped operational and financial data" /><section className="report-grid">{reports.map((report) => <article className="panel report" key={report.name}><FileBarChart /><div><h2>{report.name}</h2><p>{report.note} · {report.count} records</p></div><button className="secondary" disabled={!report.count} onClick={report.run}><Download /> Export CSV</button></article>)}</section></>;
}

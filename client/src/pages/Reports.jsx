import {
  BarChart3, ChevronDown, ChevronLeft, ChevronRight, Circle,
  Download, FileText, PackageSearch, Printer, Search, Truck, Users, WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { usePosCatalogQuery, usePurchasesQuery, useSalesQuery } from '../store/api.js';

const money = (minor = 0) => `$${(Number(minor || 0) / 100).toFixed(2)}`;
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';
const REPORTS = {
  inventory: {
    title: 'Inventory Report', icon: PackageSearch, color: '#292461',
    items: [
      ['sales', 'Sales Report'], ['purchases', 'Purchase Report'], ['stock', 'Stock Report'],
      ['product', 'Product Report'], ['expiry', 'Expire Items Report'], ['items', 'Item Report'],
      ['tax', 'Tax Report'], ['discount', 'Discount Summary'],
    ],
  },
  customers: { title: 'Customers Report', icon: Users, color: '#2184bf', items: [['customers', 'Customers List']] },
  suppliers: { title: 'Supplier Report', icon: Truck, color: '#292461', items: [['suppliers', 'Suppliers List']] },
  accounts: { title: 'Account Report', icon: WalletCards, color: '#2184bf', items: [['expenses', 'Expense Report']] },
};

function downloadCsv(filename, columns, rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [columns.map((column) => escape(column.label)).join(','), ...rows.map((row, index) => columns.map((column) => escape(column.value(row, index))).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printReport(title, columns, rows) {
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const popup = window.open('', '_blank', 'width=1100,height=760');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${escape(title)}</title><style>body{font:13px Arial;padding:22px;color:#172033}h1{font-size:21px}table{width:100%;border-collapse:collapse}th{background:#247db8;color:#fff;text-align:left}th,td{border:1px solid #ccd5df;padding:9px}tr:nth-child(even){background:#f3f4f6}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save PDF</button><h1>${escape(title)}</h1><table><thead><tr>${columns.map((column) => `<th>${escape(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, index) => `<tr>${columns.map((column) => `<td>${escape(column.value(row, index))}</td>`).join('')}</tr>`).join('')}</tbody></table><script>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  popup.document.close();
}

export default function Reports() {
  const [openGroup, setOpenGroup] = useState('inventory');
  const [active, setActive] = useState('product');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data: productsResponse, isLoading: productsLoading } = usePosCatalogQuery('products');
  const { data: customersResponse } = usePosCatalogQuery('customers');
  const { data: suppliersResponse } = usePosCatalogQuery('vendors');
  const { data: expensesResponse } = usePosCatalogQuery('expenses');
  const { data: salesResponse } = useSalesQuery({ page: 1, limit: 100 });
  const { data: purchasesResponse } = usePurchasesQuery({ page: 1, limit: 100 });

  const products = productsResponse?.data || [];
  const source = useMemo(() => {
    if (['product', 'stock', 'items'].includes(active)) return products;
    if (active === 'expiry') return products.filter((item) => item.expiresAt);
    if (active === 'customers') return customersResponse?.data || [];
    if (active === 'suppliers') return suppliersResponse?.data || [];
    if (active === 'expenses') return expensesResponse?.data || [];
    if (['sales', 'tax', 'discount'].includes(active)) return salesResponse?.data || [];
    if (active === 'purchases') return purchasesResponse?.data || [];
    return [];
  }, [active, products, customersResponse, suppliersResponse, expensesResponse, salesResponse, purchasesResponse]);

  const config = useMemo(() => {
    const number = { label: '#', value: (_row, index) => index + 1 };
    const definitions = {
      product: { title: 'Product Report', columns: [number, { label: 'Product Name', value: (x) => x.name }, { label: 'Cost Price', value: (x) => money(x.costMinor) }, { label: 'Stock', value: (x) => x.stock }] },
      items: { title: 'Item Report', columns: [number, { label: 'Item Name', value: (x) => x.name }, { label: 'Barcode', value: (x) => x.barcode || x.sku }, { label: 'Category', value: (x) => x.category }, { label: 'Unit', value: (x) => x.unit }] },
      stock: { title: 'Stock Report', columns: [number, { label: 'Product Name', value: (x) => x.name }, { label: 'Barcode', value: (x) => x.barcode || x.sku }, { label: 'Cost Price', value: (x) => money(x.costMinor) }, { label: 'Minimum', value: (x) => x.minimumStock }, { label: 'Stock', value: (x) => x.stock }, { label: 'Status', value: (x) => x.stock <= 0 ? 'OUT OF STOCK' : x.stock <= x.minimumStock ? 'LOW STOCK' : 'IN STOCK' }] },
      expiry: { title: 'Expire Items Report', columns: [number, { label: 'Product Name', value: (x) => x.name }, { label: 'Expire Date', value: (x) => date(x.expiresAt) }, { label: 'Stock', value: (x) => x.stock }, { label: 'Status', value: (x) => new Date(x.expiresAt) < new Date() ? 'EXPIRED' : 'ACTIVE' }] },
      customers: { title: 'Customers Report', columns: [number, { label: 'Customer Name', value: (x) => x.name }, { label: 'Phone', value: (x) => x.phone || '—' }, { label: 'Address', value: (x) => x.address || '—' }, { label: 'Balance', value: (x) => money(x.balanceMinor) }] },
      suppliers: { title: 'Supplier Report', columns: [number, { label: 'Supplier Name', value: (x) => x.name }, { label: 'Phone', value: (x) => x.phone || '—' }, { label: 'Address', value: (x) => x.address || '—' }] },
      expenses: { title: 'Account / Expense Report', columns: [number, { label: 'Date', value: (x) => date(x.paidAt) }, { label: 'Category', value: (x) => x.category }, { label: 'Account', value: (x) => x.method }, { label: 'Amount', value: (x) => money(x.amountMinor) }, { label: 'Description', value: (x) => x.description }] },
      sales: { title: 'Sales Report', columns: [number, { label: 'Invoice', value: (x) => x.invoiceNumber }, { label: 'Customer', value: (x) => x.customerId?.name || 'Walk-in' }, { label: 'Total', value: (x) => money(x.totalMinor) }, { label: 'Paid', value: (x) => money(x.paidMinor) }, { label: 'Status', value: (x) => x.status }] },
      purchases: { title: 'Purchase Report', columns: [number, { label: 'Purchase', value: (x) => x.purchaseNumber }, { label: 'Supplier', value: (x) => x.vendorId?.name || '—' }, { label: 'Total', value: (x) => money(x.totalMinor) }, { label: 'Paid', value: (x) => money(x.paidMinor) }, { label: 'Status', value: (x) => x.status }] },
      tax: { title: 'Tax Report', columns: [number, { label: 'Invoice', value: (x) => x.invoiceNumber }, { label: 'Date', value: (x) => date(x.createdAt) }, { label: 'Subtotal', value: (x) => money(x.subtotalMinor) }, { label: 'Tax', value: (x) => money(x.taxMinor) }, { label: 'Total', value: (x) => money(x.totalMinor) }] },
      discount: { title: 'Discount Summary', columns: [number, { label: 'Invoice', value: (x) => x.invoiceNumber }, { label: 'Date', value: (x) => date(x.createdAt) }, { label: 'Discount', value: (x) => money(x.discountMinor) }, { label: 'Total', value: (x) => money(x.totalMinor) }] },
    };
    return definitions[active] || definitions.product;
  }, [active]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((row) => config.columns.some((column) => String(column.value(row, 0) ?? '').toLowerCase().includes(needle)));
  }, [source, search, config]);
  const limit = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const rows = filtered.slice((page - 1) * limit, page * limit);
  useEffect(() => setPage(1), [active, search]);

  const chooseReport = (group, report) => {
    setOpenGroup(group);
    setActive(report);
    setSearch('');
  };

  return <>
    <PageHeader title="Reports" subtitle="Sales, inventory, customer, supplier and account reports" />
    <section className="mb-5 grid items-start gap-5 xl:grid-cols-4">
      {Object.entries(REPORTS).map(([key, group]) => {
        const Icon = group.icon;
        const isOpen = openGroup === key;
        return <article key={key} className="overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={() => setOpenGroup(isOpen ? '' : key)} className="flex h-11 w-full items-center justify-between px-4 text-sm font-bold text-white" style={{ backgroundColor: group.color }}><span className="flex items-center gap-2"><Icon className="h-4 w-4" />{group.title}</span><ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} /></button>
          {isOpen && <div className="p-3"><p className="mb-2 text-xs font-extrabold text-slate-700 dark:text-slate-200">{key === 'inventory' ? 'Sales & Inventory' : group.title}</p><div className="grid gap-1">{group.items.map(([value, label]) => <button type="button" key={value} onClick={() => chooseReport(key, value)} className={`flex items-center gap-1.5 rounded px-1 py-1 text-left text-xs ${active === value ? 'font-extrabold text-blue-600 dark:text-cyan-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Circle className="h-2.5 w-2.5" fill={active === value ? 'currentColor' : 'none'} />{label}</button>)}</div>{key === 'inventory' && <><hr className="my-3 border-slate-200 dark:border-slate-700" /><p className="mb-2 text-xs font-extrabold">Advanced Reports</p></>}</div>}
        </article>;
      })}
    </section>

    <section className="overflow-hidden border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="m-0 text-xl font-medium">{config.title}</h2><div className="text-xs text-slate-500">Home › Reports › {config.title}</div></div>
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => downloadCsv(`${active}-report.csv`, config.columns, filtered)} disabled={!filtered.length} className="inline-flex h-9 items-center gap-1.5 rounded border bg-white px-3 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-800"><Download className="h-4 w-4" />Excel</button><button type="button" onClick={() => printReport(config.title, config.columns, filtered)} disabled={!filtered.length} className="inline-flex h-9 items-center gap-1.5 rounded border bg-white px-3 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-800"><FileText className="h-4 w-4" />PDF</button><button type="button" onClick={() => printReport(config.title, config.columns, filtered)} disabled={!filtered.length} className="inline-flex h-9 items-center gap-1.5 rounded border bg-white px-3 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-800"><Printer className="h-4 w-4" />Print</button></div>
        <label className="flex items-center gap-2 text-sm font-bold">Search:<span className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded border border-slate-300 bg-white pl-8 pr-3 font-normal outline-none focus:border-blue-500 sm:w-64 dark:border-slate-600 dark:bg-slate-800" /></span></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-xs"><thead className="bg-[#337fb5] text-white"><tr>{config.columns.map((column) => <th key={column.label} className="border border-blue-400 px-3 py-3 text-left text-white">{column.label}</th>)}</tr></thead><tbody>{productsLoading && ['product', 'stock', 'items', 'expiry'].includes(active) ? <tr><td colSpan={config.columns.length} className="border p-10 text-center">Loading report…</td></tr> : rows.length ? rows.map((row, index) => <tr key={row._id || index} className="odd:bg-white even:bg-stone-100 dark:odd:bg-slate-900 dark:even:bg-slate-800">{config.columns.map((column) => <td key={column.label} className="border border-slate-200 px-3 py-2.5 dark:border-slate-700">{column.value(row, (page - 1) * limit + index)}</td>)}</tr>) : <tr><td colSpan={config.columns.length} className="border p-10 text-center text-slate-500"><BarChart3 className="mx-auto mb-2 h-8 w-8" />No data available in this report.</td></tr>}</tbody></table></div>
      <footer className="flex flex-col gap-3 border-t border-slate-200 py-3 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"><span>Showing {filtered.length ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, filtered.length)} of {filtered.length} entries</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-8 items-center gap-1 rounded border px-2 disabled:opacity-40"><ChevronLeft className="h-3 w-3" />Previous</button><b className="grid h-8 min-w-8 place-items-center border bg-slate-50 dark:bg-slate-800">{page}</b><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-8 items-center gap-1 rounded border px-2 disabled:opacity-40">Next<ChevronRight className="h-3 w-3" /></button></div></footer>
    </section>
  </>;
}

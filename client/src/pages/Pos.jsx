import { Barcode, Bell, Box, LayoutDashboard, Minus, Moon, Plus, Save, Search, ShoppingCart, Trash2, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { WhatsAppButton, Notifications } from '../components/TopbarTools.jsx';
import './Pos.css';
import { useCreateSaleMutation, usePosCatalogQuery } from '../store/api.js';

const money = (minor = 0) => `$${(Number(minor) / 100).toFixed(2)}`;
const toMinor = (value) => Math.round(Number(value || 0) * 100);
const today = () => new Date().toISOString().slice(0, 10);
const inputClass = 'h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

export default function Pos() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const barcodeRef = useRef(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('maamulpro-theme') === 'dark');
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState([]);
  const [taxRateBps, setTaxRateBps] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [discount, setDiscount] = useState('0');
  const [partialPaid, setPartialPaid] = useState('0');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const { data: productData, isLoading: productsLoading, isError: productsError, refetch } = usePosCatalogQuery('products');
  const { data: customerData } = usePosCatalogQuery('customers');
  const [createSale, { isLoading: saving }] = useCreateSaleMutation();

  const products = useMemo(() => (productData?.data || []).filter((product) => product.isActive && product.stock > 0), [productData]);
  const customers = customerData?.data || [];
  const productMap = useMemo(() => new Map(products.map((product) => [product._id, product])), [products]);
  const visibleProducts = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return products;
    return products.filter((product) => [product.name, product.sku, product.barcode, product.category].some((field) => String(field || '').toLowerCase().includes(value)));
  }, [products, search]);
  const subtotalMinor = useMemo(() => cart.reduce((total, line) => total + (productMap.get(line.productId)?.priceMinor || 0) * line.quantity, 0), [cart, productMap]);
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / 10000);
  const discountMinor = toMinor(discount);
  const totalMinor = Math.max(0, subtotalMinor + taxMinor - discountMinor);
  const paidMinor = paymentStatus === 'PAID' ? totalMinor : paymentStatus === 'UNPAID' ? 0 : toMinor(partialPaid);
  const balanceMinor = Math.max(0, totalMinor - paidMinor);

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('maamulpro-theme', darkMode ? 'dark' : 'light');
    barcodeRef.current?.focus();
  }, [darkMode]);

  const addProduct = (product) => {
    if (saving || product.stock < 1) return;
    setNotice({ type: '', message: '' });
    setCart((current) => {
      const line = current.find((item) => item.productId === product._id);
      if (!line) return [...current, { productId: product._id, quantity: 1 }];
      if (line.quantity >= product.stock) {
        setNotice({ type: 'error', message: `Only ${product.stock} ${product.name} available.` });
        return current;
      }
      return current.map((item) => item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item);
    });
  };
  const changeQuantity = (productId, amount) => setCart((current) => current.map((line) => {
    if (line.productId !== productId) return line;
    const stock = productMap.get(productId)?.stock || 1;
    return { ...line, quantity: Math.max(1, Math.min(stock, line.quantity + amount)) };
  }));
  const scan = (event) => {
    event.preventDefault();
    const code = barcode.trim().toLowerCase();
    if (!code) return;
    const product = products.find((item) => String(item.barcode || '').toLowerCase() === code || String(item.sku || '').toLowerCase() === code);
    if (product) addProduct(product);
    else setNotice({ type: 'error', message: `No product found for barcode/SKU “${barcode.trim()}”.` });
    setBarcode('');
  };
  const reset = () => {
    setCart([]); setCustomerId(''); setTaxRateBps(0); setPaymentMethod(''); setPaymentStatus('');
    setDiscount('0'); setPartialPaid('0'); setReferenceNumber(''); setNote(''); setNotice({ type: '', message: '' });
    barcodeRef.current?.focus();
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const closeAfter = event.nativeEvent.submitter?.value === 'close';
    setNotice({ type: '', message: '' });
    if (!cart.length) return setNotice({ type: 'error', message: 'Select at least one product.' });
    if (!paymentMethod) return setNotice({ type: 'error', message: 'Select a payment method.' });
    if (!paymentStatus) return setNotice({ type: 'error', message: 'Select a payment status.' });
    if (!Number.isSafeInteger(discountMinor) || discountMinor < 0 || discountMinor > subtotalMinor + taxMinor) return setNotice({ type: 'error', message: 'Discount cannot exceed the invoice amount.' });
    if (paymentStatus === 'PARTIAL' && (!Number.isSafeInteger(paidMinor) || paidMinor <= 0 || paidMinor >= totalMinor)) return setNotice({ type: 'error', message: 'Partial paid amount must be above zero and below total.' });
    if (balanceMinor > 0 && !customerId) return setNotice({ type: 'error', message: 'Select a customer for partial or unpaid sales.' });
    try {
      const response = await createSale({ customerId: customerId || null, invoiceDate: today(), items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })), taxRateBps, discountMinor, paidMinor, paymentMethod, referenceNumber: referenceNumber.trim(), note: note.trim() }).unwrap();
      reset();
      if (closeAfter) navigate('/sales');
      else setNotice({ type: 'success', message: `Invoice ${response.data.invoiceNumber} saved successfully.` });
    } catch (error) {
      setNotice({ type: 'error', message: error.data?.error?.message || 'Unable to save this sale.' });
    }
  };

  return <div className="pos-page min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <header className="fixed inset-x-0 top-0 z-50 flex h-10 items-center bg-[#292563] px-4 text-white shadow sm:px-10">
      <b className="truncate text-base">{user?.name || 'User'}</b>
      <div className="ml-auto flex items-center gap-3 text-xs sm:gap-4">
        <button type="button" onClick={() => navigate('/')} className="inline-flex h-8 items-center gap-1.5 rounded px-2 font-bold hover:bg-white/10 hover:text-cyan-200"><LayoutDashboard className="h-3.5 w-3.5" /><span className="hidden sm:inline">Dashboard</span></button>
        <span className="hidden h-6 w-px bg-white/20 sm:block" />
        <WhatsAppButton className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow hover:bg-[#1fbd5b]" />
        <Notifications />
        <button type="button" onClick={() => setDarkMode((current) => !current)} className="grid h-8 w-8 place-items-center rounded hover:bg-white/10" aria-label="Toggle dark mode" title="Dark mode"><Moon className="h-4 w-4" /></button>
        <div className="flex min-w-0 items-center gap-2 border-l border-white/20 pl-3"><span className="pos-avatar">{user?.name?.slice(0, 1)}</span><span className="hidden max-w-52 truncate font-semibold sm:inline">{user?.email || user?.name || 'User'}</span></div>
      </div>
    </header>

    <form onSubmit={submit} className="pos-workspace grid min-h-screen gap-6 px-3 pb-3 pt-[53px] xl:grid-cols-[540px_minmax(0,1fr)]">
      <section className="pos-pane flex min-h-[560px] flex-col overflow-hidden border-t-2 border-cyan-500 bg-[#fbfdff] dark:bg-slate-900">
        <header className="grid gap-3 border-b border-slate-100 p-2 sm:grid-cols-2 dark:border-slate-800">
          <label className="flex min-w-0">
            <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} min-w-0 rounded-r-none`} placeholder="Item Name" />
            <span className="grid h-9 w-10 shrink-0 place-items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"><Search className="h-4 w-4" /></span>
          </label>
          <input ref={barcodeRef} value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && scan(event)} className={`${inputClass} border-blue-400 shadow-sm`} placeholder="Scan Barcode…" autoComplete="off" />
        </header>
        <div className="pos-catalog h-[calc(100vh-105px)] overflow-y-auto px-3 pb-3 pt-1">
          {productsError && <p role="alert">Products could not load. <button type="button" onClick={refetch}>Retry</button></p>}
          {productsLoading && <p className="py-20 text-center text-sm text-slate-500">Loading products…</p>}
          {!productsLoading && !visibleProducts.length && <p className="py-20 text-center text-sm text-slate-500">No available products found.</p>}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 sm:gap-x-6">{visibleProducts.map((product) => {
            const selected = cart.find((line) => line.productId === product._id)?.quantity || 0;
            return <button key={product._id} type="button" onClick={() => addProduct(product)} className="pos-product group relative min-h-[160px] rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
              <span className="absolute right-2 top-2 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-[9px] font-black text-green-700">Qty: {Number(product.stock || 0).toFixed(2)}</span>
              {selected > 0 && <span className="absolute left-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[9px] font-black text-white">{selected}</span>}
              <span className="mx-auto mt-8 grid h-12 w-12 place-items-center rounded-xl border border-dashed border-blue-300 bg-blue-50 text-[#2584c4] transition group-hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/50"><Box className="h-6 w-6" /></span>
              <b className="mt-3 line-clamp-2 min-h-7 text-[11px] font-black uppercase leading-3.5" title={product.name}>{product.name}</b>
              <strong className="mt-2 block text-base font-extrabold text-[#2584c4]">{money(product.priceMinor)}</strong>
            </button>;
          })}</div>
        </div>
      </section>

      <section className="pos-checkout pos-pane flex min-h-[560px] flex-col overflow-hidden border-t-2 border-cyan-500 bg-white dark:bg-slate-900">
        <header className="grid gap-6 p-2 sm:grid-cols-2">
          <label className="flex min-w-0"><span className="grid h-9 w-10 shrink-0 place-items-center rounded-l border border-r-0 border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"><UserRound className="h-4 w-4" /></span><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={`${inputClass} min-w-0 rounded-l-none`}><option value="">Cash customer</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}</option>)}</select></label>
          <label className="flex min-w-0"><span className="grid h-9 w-10 shrink-0 place-items-center rounded-l border border-r-0 border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"><Barcode className="h-4 w-4" /></span><select onChange={(event) => { const product = productMap.get(event.target.value); if (product) addProduct(product); event.target.value = ''; }} defaultValue="" className={`${inputClass} min-w-0 rounded-l-none`}><option value="">Item Search</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>
        </header>
        <div className="pos-cart min-h-0 flex-1 overflow-auto px-2">
          <table className="w-full min-w-[600px] border-collapse text-xs"><thead className="bg-[#337fb5] text-white"><tr><th className="p-2 text-left text-white">Item Name</th><th className="w-44 p-2 text-center text-white">Quantity</th><th className="w-28 p-2 text-right text-white">Price</th><th className="w-28 p-2 text-right text-white">Subtotal</th><th className="w-11 p-2 text-white">×</th></tr></thead><tbody>
            {!cart.length && <tr><td colSpan="5"><span className="sr-only">Select or scan products to begin.</span></td></tr>}
            {cart.map((line) => { const product = productMap.get(line.productId); return <tr key={line.productId} className="border-b border-slate-200 dark:border-slate-700"><td className="p-2"><b>{product?.name}</b><small className="block text-slate-500">Stock: {product?.stock}</small></td><td className="p-2"><div className="mx-auto flex w-fit overflow-hidden rounded border border-slate-300 dark:border-slate-600"><button type="button" onClick={() => changeQuantity(line.productId, -1)} className="grid h-8 w-8 place-items-center"><Minus className="h-3 w-3" /></button><span className="grid h-8 w-12 place-items-center border-x border-slate-300 font-bold dark:border-slate-600">{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.productId, 1)} className="grid h-8 w-8 place-items-center"><Plus className="h-3 w-3" /></button></div></td><td className="p-2 text-right">{money(product?.priceMinor)}</td><td className="p-2 text-right font-bold">{money((product?.priceMinor || 0) * line.quantity)}</td><td className="p-2"><button type="button" onClick={() => setCart((current) => current.filter((item) => item.productId !== line.productId))} className="grid h-7 w-7 place-items-center rounded bg-red-500 text-white"><Trash2 className="h-3 w-3" /></button></td></tr>; })}
          </tbody></table>
        </div>

        <div className="pos-payment grid gap-6 border-t border-slate-200 p-4 md:grid-cols-2 dark:border-slate-700">
          <div className="space-y-3"><label className="grid items-center gap-2 text-xs font-bold sm:grid-cols-[120px_1fr]"><span className="sm:text-right">Tax (VAT)</span><select value={taxRateBps} onChange={(event) => setTaxRateBps(Number(event.target.value))} className={inputClass}><option value="0">None</option><option value="500">VAT 5%</option><option value="1000">VAT 10%</option></select></label><label className="grid items-center gap-2 text-xs font-bold sm:grid-cols-[120px_1fr]"><span className="sm:text-right">Payment Method</span><select required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}><option value="">None</option><option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Credit</option></select></label><label className="grid items-center gap-2 text-xs font-bold sm:grid-cols-[120px_1fr]"><span className="sm:text-right">Status Payment</span><select required value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={inputClass}><option value="">select status</option><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="UNPAID">Unpaid</option></select></label><label className="grid items-start gap-2 text-xs font-bold sm:grid-cols-[120px_1fr]"><span className="pt-2 sm:text-right">Note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} className="pos-note min-h-16 rounded border border-slate-300 p-2 outline-none dark:border-slate-600 dark:bg-slate-800" /></label></div>
          <div className="space-y-2 text-sm"><div className="flex items-center justify-between"><b>Subtotal</b><input readOnly value={(subtotalMinor / 100).toFixed(2)} className="h-9 w-48 rounded border border-slate-300 bg-slate-100 px-3 text-right dark:border-slate-600 dark:bg-slate-800" /></div><div className="flex items-center justify-between"><b>Tax (VAT)</b><input readOnly value={(taxMinor / 100).toFixed(2)} className="h-9 w-48 rounded border border-slate-300 px-3 text-right dark:border-slate-600 dark:bg-slate-800" /></div><div className="flex items-center justify-between"><b>Discount</b><input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className="h-9 w-48 rounded border border-slate-300 px-3 text-right dark:border-slate-600 dark:bg-slate-800" /></div><div className="flex items-center justify-between"><b>Paid</b><input type="number" min="0" step="0.01" readOnly={paymentStatus !== 'PARTIAL'} value={paymentStatus === 'PAID' ? (totalMinor / 100).toFixed(2) : paymentStatus === 'UNPAID' ? '0.00' : partialPaid} onChange={(event) => setPartialPaid(event.target.value)} className="h-9 w-48 rounded border border-slate-300 px-3 text-right read-only:bg-slate-100 dark:border-slate-600 dark:bg-slate-800" /></div><div className="flex items-center justify-between"><b>Balance</b><input readOnly value={(balanceMinor / 100).toFixed(2)} className="h-9 w-48 rounded border border-slate-300 bg-slate-100 px-3 text-right font-bold dark:border-slate-600 dark:bg-slate-800" /></div><input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} className={`${inputClass} mt-2 pos-reference`} placeholder="Transaction reference (optional)" /></div>
        </div>
        {notice.message && <div className={`mx-4 mb-2 rounded border px-3 py-2 text-xs font-bold ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.message}</div>}
        <footer className="pos-footer flex justify-center gap-6 border-t border-slate-200 p-3 dark:border-slate-700"><button type="button" onClick={() => navigate('/sales')} className="inline-flex h-9 items-center gap-1 rounded bg-red-500 px-7 text-xs font-bold text-white"><X className="h-3.5 w-3.5" />Close</button><button value="stay" disabled={saving} className="inline-flex h-9 items-center gap-1 rounded bg-[#337fb5] px-7 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save'}</button><button value="close" disabled={saving} className="inline-flex h-9 items-center gap-1 rounded bg-cyan-500 px-7 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" />Save & Close</button></footer>
      </section>
    </form>

  </div>;
}

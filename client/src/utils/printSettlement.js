const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = (minor) => `$${(Number(minor || 0) / 100).toFixed(2)}`;
export function printSettlement(rows, title) {
  const popup = window.open('', '_blank', 'width=1000,height=700');
  if (!popup) { window.alert('Allow pop-ups to print or save this report as PDF.'); return; }
  popup.opener = null;
  const lines = rows.map((row) => `<tr>${[row.paymentNumber, new Date(row.paymentDate).toLocaleDateString(), row.reference, row.customerId?.name || row.vendorId?.name || '—', row.account, money(row.amountMinor), money(row.discountMinor)].map((cell) => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('');
  popup.document.write(`<!doctype html><html><head><title>${escape(title)}</title><style>body{font:12px Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#e9f2fa}h1{font-size:20px}</style></head><body><h1>${escape(title)}</h1><p>MaamulPro · ${rows.length} records shown</p><table><thead><tr>${['Number','Date','Reference','Customer / Supplier','Account','Amount','Discount'].map((s)=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${lines}</tbody></table><p>Total: ${money(rows.reduce((sum,row)=>sum+row.amountMinor,0))} · Discount: ${money(rows.reduce((sum,row)=>sum+(row.discountMinor || 0),0))}</p></body></html>`);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 200);
}

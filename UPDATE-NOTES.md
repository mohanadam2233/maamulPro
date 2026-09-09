# POS, WhatsApp, notifications and login update

## Users and Expenses update

Copy client/src/pages/UsersList.jsx, client/src/pages/Expenses.jsx,
client/src/App.jsx, client/src/store/api.js, server/src/models/User.js and
server/src/routes/users.routes.js. Keep ContactDirectory.css and Settlement.css
from the earlier updates. Restart both frontend and backend.

The Users route now renders UsersList.jsx. Add Users supports an optional phone
number; older users display a dash where no phone was saved. Manage activates or
suspends users using the existing protected status endpoint and confirmation.
Permissions opens role information; it is not a custom permission editor.

Expenses now uses its dedicated list and creation page instead of ResourcePage.
Existing expenses, dollar conversion, backend roles and other pages are preserved.

## Receipt and Payment update

Copy client/src/pages/Receipts.jsx, client/src/pages/Payments.jsx,
client/src/pages/Settlement.css and client/src/utils/printSettlement.js,
plus the updated App.jsx, AppLayout.jsx and Dashboard.jsx.

Open /receipts for Receive List and customer receipts, /payments for Payment List
and supplier payments. Both use the existing backend settlement validation and
deduct paid amount plus discount from the outstanding party balance.

The Equal 0 / Less than 0 buttons toggle previews based on the amounts entered;
click the active filter again to show all outstanding suppliers. Negative preview
balances remain visible for correction; overpayment is rejected on save.

Excel exports the displayed receipt page as CSV; PDF uses the browser's Save as PDF
print destination. List print/PDF includes the displayed page only; each row's Print
button prints only that transaction. Page totals are explicitly labelled.

## Customer and supplier tables update

The latest update also replaces the customer/supplier generic lists with screenshot-style tables. Add, edit, delete (soft deactivation), search, sorting and pagination respect existing server permissions. Credit limits are entered in dollars and stored in minor units.

Additional files to copy:

- client/src/pages/ContactDirectory.jsx
- client/src/pages/ContactDirectory.css
- client/src/pages/Dashboard.jsx
- server/src/routes/dashboard.routes.js
- server/src/services/topCustomers.js

Also copy the updated App.jsx, store/api.js and routes/resources.routes.js listed below.

Use /customers, /vendors and /customers/top. The Dashboard Top Customers card opens the top-ten list. Ranking uses all-time invoice value, including outstanding amounts, for active named customers in the signed-in company; anonymous walk-in sales are excluded. IDs in these tables are display row numbers/ranks, not new database customer codes.

This update uses the uploaded project as its base. Existing pages and business settings are preserved.

## Install into your current project

Stop the running app with Ctrl+C. Copy these files from this ZIP into the same paths in the project you run in VS Code:

- client/src/App.jsx
- client/src/components/AppLayout.jsx
- client/src/components/TopbarTools.jsx (new)
- client/src/components/TopbarTools.css (new)
- client/src/pages/Pos.jsx (new)
- client/src/pages/Pos.css (new)
- client/src/pages/Login.jsx
- client/src/store/api.js
- server/src/routes/resources.routes.js

Do not delete your environment files or database. No database migration or reseeding is needed. Dependencies are unchanged.

Run `npm run dev` from your existing project root. Open the URL Vite prints in the terminal, then click POS. The path must be `/pos`.

The POS now contains a product grid and checkout. `/sales` remains the existing invoice list.

## Behavior

- Product name search, barcode/SKU scan, quantity controls, discount, VAT, payment status and sale saving use your existing API. Products and customers beyond the first 100 are also loaded.
- Save clears the completed sale for the next customer. Save & Close returns to Sales. Close leaves without saving.
- The green WhatsApp logo opens support using the number previously provided. To override it, set VITE_WHATSAPP_NUMBER and optionally VITE_WHATSAPP_MESSAGE in client/.env.local and restart Vite (rebuild for production).
- Notifications are current low-stock alerts, not unread messages. The badge counts active products at or below minimum stock for the signed-in company. The panel shows the first 20 and links to Stock Management. It refreshes once a minute and after stock-changing actions. A loading failure has a Retry action.
- Login shows accessible green success and red error messages, with separate network, invalid-credentials and server-error text.

The dropdown settings shown in the reference (language, lock screen and change password) are not changed by this focused update.

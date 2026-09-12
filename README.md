# MaamulPro

MaamulPro is a multi-tenant MERN business-management and POS application. It includes a platform owner console, subscription payment approval, tenant account control, secure authentication, dashboard analytics, products and stock, customer credit control, VAT-aware sales/invoices, supplier purchases, customer receipts, supplier payments, vendors, expenses, users, billing, reports, and printable barcode labels.

## Stack

- React + Vite, Redux Toolkit/RTK Query, Recharts, Lucide
- Node.js + Express
- MongoDB + Mongoose
- JWT access token + rotating HttpOnly refresh cookie

## Quick start

### Requirements

- Node.js 20 or newer
- MongoDB replica set (transactions are used by checkout), or Docker Desktop

### Local setup

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:5000/api/v1`  
Health: `http://localhost:5000/api/v1/health`

### Local Docker production build

```bash
cp .env.production.example .env
# Replace both JWT secrets in .env before starting.
docker compose up --build -d
docker compose exec api npm run seed --workspace=server
```

Open `http://localhost:8080`. The React application is built into static production assets and served by Nginx; `/api` is proxied to Express.

The Docker MongoDB configuration enables the replica set needed for safe sales transactions.


These credentials are development-only. Replace them before any deployment.

## Important behavior

- Every business record is scoped by the authenticated user's `tenantId`.
- Client-supplied tenant IDs are ignored.
- Tenant write operations require an active or trial subscription.
- Billing remains available when a tenant is suspended so an admin can submit payment.
- The Platform Super Admin can approve/reject payments and suspend/restore accounts.
- Checkout is transactional: the invoice and stock deduction succeed or fail together.
- Customer credit is validated before partial or unpaid invoices are accepted.
- VAT, discounts, paid totals, and balances are calculated on the server.
- Partial and unpaid purchases create supplier balances; supplier payments reduce those balances.
- Customer receipts reduce customer balances and prevent overpayment.
- Business payments and SaaS subscription payments use separate APIs and records.
- Users enter normal dollar values such as `1.50`; money is stored as integer minor units for accuracy.

## Verification

```bash
npm run build
npm test
npm run check -w server
```

## Production checklist

- Use strong unique JWT secrets and a managed MongoDB replica set.
- Set `CLIENT_URL` to the exact HTTPS application origin.
- Configure HTTPS and a strict production CORS origin.
- Replace development accounts and remove seed credentials.
- Add object storage before enabling payment evidence uploads.
- Add email/SMS provider credentials for reminders.
- Add automated database backups and restore tests.
- Run an external security assessment before handling real financial data.

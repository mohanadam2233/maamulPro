import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { clearCredentials, setCredentials } from './authSlice.js';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1', credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQuery = async (args, api, extra) => {
  let result = await rawBaseQuery(args, api, extra);
  if (result.error?.status === 401 && !String(typeof args === 'string' ? args : args.url).includes('auth/')) {
    const refresh = await rawBaseQuery({ url: 'auth/refresh', method: 'POST' }, api, extra);
    if (refresh.data?.data) {
      api.dispatch(setCredentials(refresh.data.data));
      result = await rawBaseQuery(args, api, extra);
    } else api.dispatch(clearCredentials());
  }
  return result;
};

const resourceTag = (resource) => ({ products: 'Products', customers: 'Customers', vendors: 'Vendors', expenses: 'Expenses' }[resource] || 'Dashboard');

export const api = createApi({
  reducerPath: 'api', baseQuery,
  tagTypes: ['Dashboard', 'Products', 'InventoryOptions', 'Customers', 'Vendors', 'Expenses', 'Sales', 'Purchases', 'BusinessPayments', 'Users', 'Billing', 'Platform'],
  endpoints: (builder) => ({
    changeUserStatus: builder.mutation({ query: ({ id, isActive }) => ({ url: `users/${id}/status`, method: 'PATCH', body: { isActive } }), invalidatesTags: ['Users', 'Dashboard'] }),
    topCustomers: builder.query({ query: () => 'customers/top', providesTags: ['Customers', 'Sales'] }),
    stockAlerts: builder.query({ query: () => 'products/alerts', providesTags: ['Products'] }),
    posCatalog: builder.query({
      async queryFn(resource, _api, _extra, baseQuery) {
        const first = await baseQuery(`${resource}?page=1&limit=100`);
        if (first.error) return { error: first.error };
        const items = [...first.data.data];
        for (let page = 2; page <= (first.data.meta?.pages || 1); page += 1) {
          const next = await baseQuery(`${resource}?page=${page}&limit=100`);
          if (next.error) return { error: next.error };
          items.push(...next.data.data);
        }
        return { data: { data: items } };
      },
      providesTags: (_r, _e, resource) => [resourceTag(resource)],
    }),
    login: builder.mutation({ query: (body) => ({ url: 'auth/login', method: 'POST', body }) }),
    refresh: builder.mutation({ query: () => ({ url: 'auth/refresh', method: 'POST' }) }),
    logout: builder.mutation({ query: () => ({ url: 'auth/logout', method: 'POST' }) }),
    dashboard: builder.query({ query: () => 'dashboard', providesTags: ['Dashboard'] }),
    resourceList: builder.query({ query: ({ resource, search = '', from = '', to = '', page = 1, limit = 20 }) => `${resource}?search=${encodeURIComponent(search)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${page}&limit=${limit}`, providesTags: (_r, _e, a) => [resourceTag(a.resource)] }),
    createResource: builder.mutation({ query: ({ resource, body }) => ({ url: resource, method: 'POST', body }), invalidatesTags: (_r, _e, a) => [resourceTag(a.resource), 'Dashboard'] }),
    updateResource: builder.mutation({ query: ({ resource, id, body }) => ({ url: `${resource}/${id}`, method: 'PATCH', body }), invalidatesTags: (_r, _e, a) => [resourceTag(a.resource), 'Dashboard'] }),
    deleteResource: builder.mutation({ query: ({ resource, id }) => ({ url: `${resource}/${id}`, method: 'DELETE' }), invalidatesTags: (_r, _e, a) => [resourceTag(a.resource), 'Dashboard'] }),
    adjustProductStock: builder.mutation({ query: ({ id, ...body }) => ({ url: `products/${id}/stock`, method: 'PATCH', body }), invalidatesTags: ['Products', 'Dashboard'] }),
    inventoryOptions: builder.query({ query: () => 'inventory/options', providesTags: ['InventoryOptions'] }),
    addInventoryOption: builder.mutation({ query: (body) => ({ url: 'inventory/options', method: 'POST', body }), invalidatesTags: ['InventoryOptions'] }),
    sales: builder.query({
      query: ({ from = '', to = '', search = '', page = 1, limit = 10 } = {}) => `sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
      providesTags: ['Sales'],
    }),
    createSale: builder.mutation({ query: (body) => ({ url: 'sales', method: 'POST', body }), invalidatesTags: ['Sales', 'Products', 'Dashboard'] }),
    purchases: builder.query({
      query: ({ from = '', to = '', search = '', page = 1, limit = 10 } = {}) => `purchases?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
      providesTags: ['Purchases'],
    }),
    createPurchase: builder.mutation({ query: (body) => ({ url: 'purchases', method: 'POST', body }), invalidatesTags: ['Purchases', 'Products', 'Vendors', 'Dashboard'] }),
    businessPayments: builder.query({
      query: ({ from = '', to = '', search = '', type = '', page = 1, limit = 10 } = {}) => `payments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}&page=${page}&limit=${limit}`,
      providesTags: ['BusinessPayments'],
    }),
    receiveCustomerPayment: builder.mutation({ query: (body) => ({ url: 'payments/customer', method: 'POST', body }), invalidatesTags: ['BusinessPayments', 'Customers', 'Dashboard'] }),
    makeSupplierPayment: builder.mutation({ query: (body) => ({ url: 'payments/supplier', method: 'POST', body }), invalidatesTags: ['BusinessPayments', 'Vendors', 'Dashboard'] }),
    users: builder.query({ query: () => 'users', providesTags: ['Users'] }),
    createUser: builder.mutation({ query: (body) => ({ url: 'users', method: 'POST', body }), invalidatesTags: ['Users', 'Dashboard'] }),
    billing: builder.query({ query: () => 'billing', providesTags: ['Billing'] }),
    submitPayment: builder.mutation({ query: (body) => ({ url: 'billing/payments', method: 'POST', body }), invalidatesTags: ['Billing'] }),
    platformOverview: builder.query({ query: () => 'platform/overview', providesTags: ['Platform'] }),
    platformTenants: builder.query({ query: () => 'platform/tenants', providesTags: ['Platform'] }),
    createTenant: builder.mutation({ query: (body) => ({ url: 'platform/tenants', method: 'POST', body }), invalidatesTags: ['Platform'] }),
    platformPayments: builder.query({ query: () => 'platform/payments', providesTags: ['Platform'] }),
    decidePayment: builder.mutation({ query: ({ id, ...body }) => ({ url: `platform/payments/${id}/decision`, method: 'POST', body }), invalidatesTags: ['Platform'] }),
    changeTenantStatus: builder.mutation({ query: ({ id, ...body }) => ({ url: `platform/tenants/${id}/status`, method: 'POST', body }), invalidatesTags: ['Platform'] }),
  }),
});

export const { useStockAlertsQuery, usePosCatalogQuery, useTopCustomersQuery, useChangeUserStatusMutation } = api;

export const { useLoginMutation, useRefreshMutation, useLogoutMutation, useDashboardQuery, useResourceListQuery, useCreateResourceMutation, useUpdateResourceMutation, useDeleteResourceMutation, useAdjustProductStockMutation, useInventoryOptionsQuery, useAddInventoryOptionMutation, useSalesQuery, useCreateSaleMutation, usePurchasesQuery, useCreatePurchaseMutation, useBusinessPaymentsQuery, useReceiveCustomerPaymentMutation, useMakeSupplierPaymentMutation, useUsersQuery, useCreateUserMutation, useBillingQuery, useSubmitPaymentMutation, usePlatformOverviewQuery, usePlatformTenantsQuery, useCreateTenantMutation, usePlatformPaymentsQuery, useDecidePaymentMutation, useChangeTenantStatusMutation } = api;

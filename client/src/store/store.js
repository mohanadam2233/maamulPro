import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice.js';
import { api } from './api.js';

export const store = configureStore({
  reducer: { auth, [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});

import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, accessToken: null, initialized: false },
  reducers: {
    setCredentials: (state, action) => { state.user = action.payload.user; state.accessToken = action.payload.accessToken; state.initialized = true; },
    updateCurrentUser: (state, action) => { state.user = action.payload; },
    clearCredentials: (state) => { state.user = null; state.accessToken = null; state.initialized = true; },
    markInitialized: (state) => { state.initialized = true; },
  },
});
export const { setCredentials, updateCurrentUser, clearCredentials, markInitialized } = slice.actions;
export default slice.reducer;

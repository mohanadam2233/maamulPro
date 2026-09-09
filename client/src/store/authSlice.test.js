import { describe, expect, it } from 'vitest';
import reducer, { clearCredentials, markInitialized, setCredentials } from './authSlice.js';

describe('auth state', () => {
  it('stores and clears a secure in-memory access session', () => {
    const authenticated = reducer(undefined, setCredentials({ accessToken: 'token', user: { id: '1', role: 'BUSINESS_ADMIN' } }));
    expect(authenticated.initialized).toBe(true);
    expect(authenticated.user.role).toBe('BUSINESS_ADMIN');
    expect(reducer(authenticated, clearCredentials())).toEqual({ user: null, accessToken: null, initialized: true });
  });

  it('marks refresh initialization without inventing a user', () => {
    expect(reducer(undefined, markInitialized())).toEqual({ user: null, accessToken: null, initialized: true });
  });
});

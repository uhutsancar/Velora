import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

/**
 * Pure UI state. Server data lives in RTK Query, never here — mixing the two is
 * what turns a store into a second, stale copy of the database.
 */
export interface UiState {
  cartDrawerOpen: boolean;
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  filtersOpen: boolean;
  toasts: Toast[];
  /** Product ids the shopper looked at, newest first. Persisted in localStorage. */
  recentlyViewed: number[];
}

const RECENTLY_VIEWED_KEY = 'velora.recentlyViewed';
const RECENTLY_VIEWED_LIMIT = 12;

const readRecentlyViewed = (): number[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
};

const initialState: UiState = {
  cartDrawerOpen: false,
  searchOpen: false,
  mobileMenuOpen: false,
  filtersOpen: false,
  toasts: [],
  recentlyViewed: readRecentlyViewed(),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openCartDrawer(state) {
      state.cartDrawerOpen = true;
    },
    closeCartDrawer(state) {
      state.cartDrawerOpen = false;
    },
    toggleSearch(state, action: PayloadAction<boolean | undefined>) {
      state.searchOpen = action.payload ?? !state.searchOpen;
    },
    toggleMobileMenu(state, action: PayloadAction<boolean | undefined>) {
      state.mobileMenuOpen = action.payload ?? !state.mobileMenuOpen;
    },
    toggleFilters(state, action: PayloadAction<boolean | undefined>) {
      state.filtersOpen = action.payload ?? !state.filtersOpen;
    },
    closeAllOverlays(state) {
      state.cartDrawerOpen = false;
      state.searchOpen = false;
      state.mobileMenuOpen = false;
      state.filtersOpen = false;
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        // Cap the stack so a burst of failures cannot cover the page.
        state.toasts = [...state.toasts.slice(-2), action.payload];
      },
      prepare(message: string, variant: ToastVariant = 'info') {
        return { payload: { id: nanoid(), message, variant } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    recordProductView(state, action: PayloadAction<number>) {
      const next = [action.payload, ...state.recentlyViewed.filter((id) => id !== action.payload)];
      state.recentlyViewed = next.slice(0, RECENTLY_VIEWED_LIMIT);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(state.recentlyViewed));
      }
    },
  },
});

export const {
  openCartDrawer,
  closeCartDrawer,
  toggleSearch,
  toggleMobileMenu,
  toggleFilters,
  closeAllOverlays,
  pushToast,
  dismissToast,
  recordProductView,
} = uiSlice.actions;

export const selectCartDrawerOpen = (state: RootState) => state.ui.cartDrawerOpen;
export const selectSearchOpen = (state: RootState) => state.ui.searchOpen;
export const selectMobileMenuOpen = (state: RootState) => state.ui.mobileMenuOpen;
export const selectFiltersOpen = (state: RootState) => state.ui.filtersOpen;
export const selectToasts = (state: RootState) => state.ui.toasts;
export const selectRecentlyViewed = (state: RootState) => state.ui.recentlyViewed;

export default uiSlice.reducer;

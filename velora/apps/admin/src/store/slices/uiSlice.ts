import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface UiState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toasts: Toast[];
}

const SIDEBAR_KEY = 'velora.admin.sidebarCollapsed';

const readCollapsed = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_KEY) === 'true';
};

const initialState: UiState = {
  sidebarCollapsed: readCollapsed(),
  mobileSidebarOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;

      // Persisted so the layout preference survives a reload.
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_KEY, String(state.sidebarCollapsed));
      }
    },
    setMobileSidebar(state, action: PayloadAction<boolean>) {
      state.mobileSidebarOpen = action.payload;
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts = [...state.toasts.slice(-2), action.payload];
      },
      prepare(message: string, variant: ToastVariant = 'info') {
        return { payload: { id: nanoid(), message, variant } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { toggleSidebar, setMobileSidebar, pushToast, dismissToast } = uiSlice.actions;

export const selectSidebarCollapsed = (state: RootState) => state.ui.sidebarCollapsed;
export const selectMobileSidebarOpen = (state: RootState) => state.ui.mobileSidebarOpen;
export const selectToasts = (state: RootState) => state.ui.toasts;

export default uiSlice.reducer;

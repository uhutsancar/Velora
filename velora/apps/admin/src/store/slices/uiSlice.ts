import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { createStorageItem, isBoolean, STORAGE_KEYS } from '@velora/shared';
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

const sidebarCollapsedStore = createStorageItem<boolean>({
  key: STORAGE_KEYS.adminSidebarCollapsed,
  fallback: false,
  validate: isBoolean,
});

const initialState: UiState = {
  sidebarCollapsed: sidebarCollapsedStore.read(),
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
      sidebarCollapsedStore.write(state.sidebarCollapsed);
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

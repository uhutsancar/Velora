import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

// Side-effect imports: each module injects its endpoints into `baseApi`.
import './api/catalogApi';
import './api/basketApi';
import './api/accountApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // RTK Query stores AbortSignals on its internal actions.
        ignoredActions: ['api/executeQuery/pending', 'api/executeMutation/pending'],
      },
    }).concat(baseApi.middleware),
  devTools: !import.meta.env.PROD,
});

// Enables refetchOnFocus / refetchOnReconnect behaviour.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

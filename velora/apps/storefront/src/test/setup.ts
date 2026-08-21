import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { initI18n } from '@velora/shared';

// Mirrors main.tsx: modules outside React (thunks, error boundaries) read i18n.t directly.
initI18n();

// jsdom implements neither of these; several components depend on them.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

class IntersectionObserverMock {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

if (!window.crypto?.randomUUID) {
  Object.defineProperty(window, 'crypto', {
    value: { ...window.crypto, randomUUID: () => '00000000-0000-4000-8000-000000000000' },
  });
}

window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

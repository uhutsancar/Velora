import { beforeEach, describe, expect, it } from 'vitest';
import reducer, {
  closeAllOverlays,
  closeCartDrawer,
  dismissToast,
  openCartDrawer,
  pushToast,
  recordProductView,
  toggleFilters,
  toggleMobileMenu,
  toggleSearch,
  type UiState,
} from './uiSlice';

const initial: UiState = {
  cartDrawerOpen: false,
  searchOpen: false,
  mobileMenuOpen: false,
  filtersOpen: false,
  toasts: [],
  recentlyViewed: [],
};

describe('uiSlice overlays', () => {
  it('opens and closes the cart drawer', () => {
    const opened = reducer(initial, openCartDrawer());
    expect(opened.cartDrawerOpen).toBe(true);

    expect(reducer(opened, closeCartDrawer()).cartDrawerOpen).toBe(false);
  });

  it('toggles search when no explicit value is given', () => {
    const opened = reducer(initial, toggleSearch(undefined));
    expect(opened.searchOpen).toBe(true);

    expect(reducer(opened, toggleSearch(undefined)).searchOpen).toBe(false);
  });

  it('honours an explicit toggle value', () => {
    expect(reducer(initial, toggleSearch(true)).searchOpen).toBe(true);
    expect(reducer({ ...initial, searchOpen: true }, toggleSearch(true)).searchOpen).toBe(true);
  });

  it('closes every overlay at once, which is what route changes need', () => {
    const messy: UiState = {
      ...initial,
      cartDrawerOpen: true,
      searchOpen: true,
      mobileMenuOpen: true,
      filtersOpen: true,
    };

    const result = reducer(messy, closeAllOverlays());

    expect(result.cartDrawerOpen).toBe(false);
    expect(result.searchOpen).toBe(false);
    expect(result.mobileMenuOpen).toBe(false);
    expect(result.filtersOpen).toBe(false);
  });

  it('toggles the mobile menu and the filter drawer independently', () => {
    const withMenu = reducer(initial, toggleMobileMenu(true));
    const withBoth = reducer(withMenu, toggleFilters(true));

    expect(withBoth.mobileMenuOpen).toBe(true);
    expect(withBoth.filtersOpen).toBe(true);
  });
});

describe('uiSlice toasts', () => {
  it('adds a toast with a generated id', () => {
    const result = reducer(initial, pushToast('Sepete eklendi', 'success'));

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0]).toMatchObject({ message: 'Sepete eklendi', variant: 'success' });
    expect(result.toasts[0]?.id).toBeTruthy();
  });

  it('caps the stack at three so a burst cannot cover the page', () => {
    let state = initial;

    for (let index = 0; index < 6; index += 1) {
      state = reducer(state, pushToast(`toast ${index}`));
    }

    expect(state.toasts).toHaveLength(3);
    expect(state.toasts[2]?.message).toBe('toast 5');
  });

  it('dismisses a toast by id', () => {
    const withToast = reducer(initial, pushToast('bir mesaj'));
    const id = withToast.toasts[0]!.id;

    expect(reducer(withToast, dismissToast(id)).toasts).toHaveLength(0);
  });
});

describe('uiSlice recently viewed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records the newest product first', () => {
    let state = reducer(initial, recordProductView(1));
    state = reducer(state, recordProductView(2));

    expect(state.recentlyViewed).toEqual([2, 1]);
  });

  it('moves a repeat view to the front instead of duplicating it', () => {
    let state = reducer(initial, recordProductView(1));
    state = reducer(state, recordProductView(2));
    state = reducer(state, recordProductView(1));

    expect(state.recentlyViewed).toEqual([1, 2]);
  });

  it('keeps at most twelve entries', () => {
    let state = initial;

    for (let id = 1; id <= 20; id += 1) {
      state = reducer(state, recordProductView(id));
    }

    expect(state.recentlyViewed).toHaveLength(12);
    expect(state.recentlyViewed[0]).toBe(20);
  });

  it('persists the list to localStorage', () => {
    reducer(initial, recordProductView(7));

    expect(window.localStorage.getItem('velora.recentlyViewed')).toBe('[7]');
  });
});

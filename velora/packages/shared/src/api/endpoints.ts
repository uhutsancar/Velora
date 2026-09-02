/**
 * Every path the frontends call, in one place.
 * These are gateway paths (Ocelot upstream templates), not service-internal routes.
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },

  addresses: {
    root: '/addresses',
    byId: (id: string) => `/addresses/${id}`,
    setDefault: (id: string) => `/addresses/${id}/default`,
  },

  products: {
    search: '/products',
    facets: '/products/facets',
    featured: '/products/featured',
    newArrivals: '/products/new-arrivals',
    bestSellers: '/products/best-sellers',
    batch: '/products/batch',
    bySlug: (slug: string) => `/products/${slug}`,
    related: (slug: string) => `/products/${slug}/related`,
    reviews: (productId: number) => `/products/${productId}/reviews`,
    reviewSummary: (productId: number) => `/products/${productId}/reviews/summary`,
    review: (productId: number, reviewId: number) => `/products/${productId}/reviews/${reviewId}`,
  },

  categories: {
    tree: '/categories',
    flat: '/categories/flat',
    featured: '/categories/featured',
    bySlug: (slug: string) => `/categories/${slug}`,
  },

  brands: {
    root: '/brands',
    bySlug: (slug: string) => `/brands/${slug}`,
  },

  campaigns: {
    root: '/campaigns',
    bySlug: (slug: string) => `/campaigns/${slug}`,
  },

  coupons: {
    validate: '/coupons/validate',
  },

  basket: {
    me: '/basket/me',
    update: '/basket/update',
    addItem: '/basket/additem',
    item: (lineId: string) => `/basket/items/${lineId}`,
    clear: '/basket/clear',
    checkout: '/basket/checkout',
    coupon: '/basket/coupon',
    wishlist: '/basket/wishlist',
    wishlistItem: (productId: number) => `/basket/wishlist/${productId}`,
  },

  orders: {
    root: '/orders',
    statuses: '/orders/statuses',
    byId: (id: string) => `/orders/${id}`,
    cancel: (id: string) => `/orders/${id}/cancel`,
  },

  admin: {
    products: {
      root: '/admin/products',
      stats: '/admin/products/stats',
      byId: (id: number) => `/admin/products/${id}`,
      publish: (id: number) => `/admin/products/${id}/publish`,
      stock: (id: number) => `/admin/products/${id}/stock`,
      pricing: (id: number) => `/admin/products/${id}/pricing`,
      images: (id: number) => `/admin/products/${id}/images`,
      image: (id: number, imageId: number) => `/admin/products/${id}/images/${imageId}`,
      imageOrder: (id: number) => `/admin/products/${id}/images/order`,
      primaryImage: (id: number, imageId: number) =>
        `/admin/products/${id}/images/${imageId}/primary`,
    },
    categories: {
      root: '/admin/categories',
      byId: (id: number) => `/admin/categories/${id}`,
    },
    brands: {
      root: '/admin/brands',
      byId: (id: number) => `/admin/brands/${id}`,
    },
    coupons: {
      root: '/admin/coupons',
      byId: (id: number) => `/admin/coupons/${id}`,
    },
    campaigns: {
      root: '/admin/campaigns',
      byId: (id: number) => `/admin/campaigns/${id}`,
    },
    reviews: {
      root: '/admin/reviews',
      approval: (id: number) => `/admin/reviews/${id}/approval`,
      byId: (id: number) => `/admin/reviews/${id}`,
    },
    media: {
      root: '/admin/media',
      byName: (fileName: string) => `/admin/media/${fileName}`,
    },
    orders: {
      root: '/admin/orders',
      byId: (id: string) => `/admin/orders/${id}`,
      status: (id: string) => `/admin/orders/${id}/status`,
    },
    analytics: {
      dashboard: '/admin/analytics/dashboard',
    },
    users: {
      root: '/users',
      stats: '/users/stats',
      byId: (id: string) => `/users/${id}`,
      status: (id: string) => `/users/${id}/status`,
      roles: (id: string) => `/users/${id}/roles`,
      resetPassword: (id: string) => `/users/${id}/reset-password`,
    },
    roles: {
      root: '/roles',
      permissions: '/roles/permissions',
    },
  },
} as const;

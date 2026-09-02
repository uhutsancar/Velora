/** Identity contracts — mirror of IdentityService `Application/Models`. */

export interface UserProfile {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAtUtc: string;
  lastLoginAtUtc: string | null;
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
}

export interface AuthResponse {
  userName: string;
  /** Legacy alias kept by the API; identical to `accessToken`. */
  userToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: UserProfile;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface Address {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
}

export type AddressRequest = Omit<Address, 'id'>;

export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAtUtc: string;
  lastLoginAtUtc: string | null;
  roles: string[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersLast30Days: number;
  adminUsers: number;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions: string[];
}

export interface Permission {
  code: string;
  description: string | null;
}

export const VELORA_ROLES = {
  Admin: 'Admin',
  Manager: 'Manager',
  Customer: 'Customer',
} as const;

export type VeloraRole = (typeof VELORA_ROLES)[keyof typeof VELORA_ROLES];

/** Permission codes seeded by IdentityService. */
export const PERMISSIONS = {
  ProductsRead: 'products.read',
  ProductsWrite: 'products.write',
  CategoriesWrite: 'categories.write',
  BrandsWrite: 'brands.write',
  OrdersRead: 'orders.read',
  OrdersWrite: 'orders.write',
  UsersRead: 'users.read',
  UsersWrite: 'users.write',
  CouponsWrite: 'coupons.write',
  CampaignsWrite: 'campaigns.write',
  AnalyticsRead: 'analytics.read',
  SettingsWrite: 'settings.write',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

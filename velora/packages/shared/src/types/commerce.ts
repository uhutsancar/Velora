/** Basket and order contracts — mirror of BasketService / OrderService payloads. */

export interface BasketItem {
  id: string;
  productId: number;
  productName: string;
  unitPrice: number;
  oldUnitPrice: number;
  quantity: number;
  pictureUrl: string;
  slug: string | null;
  variantId: number | null;
  variantLabel: string | null;
  availableStock: number;
  lineTotal: number;
}

export interface CustomerBasket {
  buyerId: string;
  items: BasketItem[];
  couponCode: string | null;
  discountAmount: number;
  updatedAtUtc: string;
  subtotal: number;
  totalQuantity: number;
  total: number;
}

export interface CustomerWishlist {
  buyerId: string;
  productIds: number[];
  updatedAtUtc: string;
}

/** Line as sent to POST /basket/additem — the server fills in the rest. */
export interface AddBasketItemRequest {
  productId: number;
  productName: string;
  unitPrice: number;
  oldUnitPrice: number;
  quantity: number;
  pictureUrl: string;
  slug?: string | null;
  variantId?: number | null;
  variantLabel?: string | null;
  availableStock: number;
}

export interface BasketCheckoutRequest {
  city: string;
  street: string;
  state: string;
  country: string;
  zipCode: string;
  cardNumber: string;
  cardHolderName: string;
  cardExpiration: string;
  cardSecurityNumber: string;
  cardTypeId: number;
  buyer: string;
}

export const ORDER_STATUS = {
  Submitted: 1,
  AwaitingValidation: 2,
  StockConfirmed: 3,
  Paid: 4,
  Shipped: 5,
  Cancelled: 6,
} as const;

export type OrderStatusId = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export interface OrderStatusOption {
  id: number;
  name: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  date: string;
  statusId: number;
  status: string;
  total: number;
  discountAmount: number;
  itemCount: number;
  userId: string | null;
  userName: string | null;
  city: string | null;
  country: string | null;
  firstItemName: string | null;
  firstItemImage: string | null;
}

export interface OrderItem {
  productId: number;
  productname: string;
  units: number;
  unitprice: number;
  pictureurl: string | null;
  variantId: number | null;
  variantLabel: string | null;
  lineTotal: number;
}

export interface OrderDetail {
  id: string;
  ordernumber: string;
  date: string;
  statusId: number;
  status: string;
  description: string | null;
  userId: string | null;
  userName: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  country: string | null;
  couponCode: string | null;
  discountAmount: number;
  subtotal: number;
  total: number;
  paidAtUtc: string | null;
  shippedAtUtc: string | null;
  cancelledAtUtc: string | null;
  cancelReason: string | null;
  orderitems: OrderItem[];
}

export interface SalesSummary {
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  previousMonthRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  todayOrders: number;
  monthOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  uniqueCustomers: number;
  revenueGrowthPercentage: number;
}

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  pictureUrl: string | null;
  unitsSold: number;
  revenue: number;
}

export interface OrderStatusBreakdown {
  statusId: number;
  status: string;
  count: number;
  revenue: number;
}

export interface DashboardData {
  summary: SalesSummary;
  salesSeries: SalesPoint[];
  topProducts: TopProduct[];
  statusBreakdown: OrderStatusBreakdown[];
  recentOrders: OrderSummary[];
}

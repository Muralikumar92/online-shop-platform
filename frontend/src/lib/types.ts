/** Shared DTO shapes mirroring the backend's JSON responses (kept minimal / only the fields the UI uses). */

export interface ShopPublic {
  slug: string;
  name: string;
  logoUrl: string | null;
}

export interface CategoryPublic {
  id: number;
  name: string;
  thumbnailUrl: string | null;
}

export interface ItemMediaPublic {
  id: number;
  url: string;
  type: "IMAGE" | "VIDEO";
  displayOrder: number;
}

/** Mirrors the backend's single ItemResponse DTO, used for both the category
 * item grid and the item detail page (the backend doesn't distinguish a
 * separate "summary" shape). */
export interface ItemPublic {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  priceInPaise: number;
  discountPercentage: number;
  effectivePriceInPaise: number;
  stockQuantity: number;
  active: boolean;
  media: ItemMediaPublic[];
}

export interface CartLine {
  itemId: number;
  name: string;
  priceInPaise: number;
  thumbnailUrl: string | null;
  quantity: number;
}

export interface CustomerProfile {
  customerId: number;
  shopId: number;
  email: string;
  fullName: string | null;
}

export interface OrderLineItem {
  itemId: number;
  name: string;
  unitPriceInPaise: number;
  quantity: number;
  lineTotalInPaise: number;
}

export type OrderStatus =
  | "REQUESTED"
  | "PENDING_PAYMENT"
  | "PAYMENT_SUBMITTED"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "PACKED"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "DELIVERED";

export type PaymentMethod = "RAZORPAY" | "MANUAL";

export interface OrderResponse {
  id: number;
  status: OrderStatus;
  subtotalInPaise: number;
  discountInPaise: number;
  totalInPaise: number;
  couponCode: string | null;
  customerEmail: string | null;
  shippingFullName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  guest: boolean;
  createdAt: string;
  updatedAt: string;
  items: OrderLineItem[];
  manualPaymentInstructions: ManualPaymentInstructions | null;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CustomerAddress {
  id: number;
  label: string | null;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface ManualPaymentInstructions {
  contactPhone: string | null;
  upiId: string | null;
  upiDeepLink: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
}

export interface CheckoutInitiateResponse {
  orderId: number;
  paymentMethod: PaymentMethod;
  razorpayOrderId: string | null;
  amountInPaise: number;
  razorpayKeyId: string | null;
  manualPaymentInstructions: ManualPaymentInstructions | null;
}

/** Guest checkout (no account/login) - see GuestCheckoutRequest/Response on the backend. */
export interface GuestCheckoutRequestBody {
  items: { itemId: number; quantity: number }[];
  couponCode?: string | null;
  shippingAddress: ShippingAddress;
}

export interface GuestCheckoutResponse {
  orderId: number;
  trackingToken: string;
  trackingUrl: string;
  totalInPaise: number;
  shareMessage: string;
}

/** Owner-facing category shape (includes display order / active, unlike the public CategoryPublic). */
export interface CategoryOwner {
  id: number;
  name: string;
  thumbnailUrl: string | null;
  displayOrder: number;
  active: boolean;
}

export interface CouponResponse {
  id: number;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  currentlyValid: boolean;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  priceInPaise: number;
  durationDays: number;
}

export interface InitiateSubscriptionResponse {
  razorpayOrderId: string;
  amountInPaise: number;
  currency: string;
  razorpayKeyId: string;
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

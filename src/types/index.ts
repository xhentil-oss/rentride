// Shared API entity types. Mirror backend fmt()/toCamel() shapes in backend/routes/*.js.
// Optional fields are those the backend may omit (admin-only) or that vary per row.

export type ISODateTime = string;
export type DateOnly = string; // YYYY-MM-DD

export type ReservationStatus =
  | "Pending"
  | "Confirmed"
  | "Active"
  | "Completed"
  | "Cancelled";

export type CarStatus =
  | "Në dispozicion"
  | "I rezervuar"
  | "Në mirëmbajtje"
  | "Available"
  | "Rented"
  | "Maintenance";

export type CustomerType = "Standard" | "VIP" | "Korporatë";

export type ScoringTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type UserRole = "admin" | "manager" | "staff" | "accountant" | "customer";

// ─── Customer ─────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  type: CustomerType;
  // Admin extras (may be absent on basic GET):
  scoringTier?: ScoringTier;
  isBlacklisted?: boolean;
  corporateContractId?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─── Car ──────────────────────────────────────────────────────────────────
export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuel: string;
  seats: number;
  luggage: number;
  pricePerDay: number;
  status: CarStatus;
  image: string;
  slug: string;
  featured: boolean;
  quantity: number;
  description: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─── Reservation ──────────────────────────────────────────────────────────
export interface Reservation {
  id: string;
  carId: string;
  customerId: string;
  pickupLocation: string;
  dropoffLocation: string;
  startDate: DateOnly;
  startTime: string; // HH:MM
  endDate: DateOnly;
  endTime: string;
  notes: string;
  source: string;
  status: ReservationStatus;
  totalPrice: number;
  locationFee: number;
  insurance?: string | null;
  extras?: string | null;
  discountCode?: string | null;
  paymentStatus?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─── Invoice ──────────────────────────────────────────────────────────────
export interface Invoice {
  id: string;
  invoiceNo: string;
  reservationId: string;
  amount: number;
  status: string;
  dueDate: DateOnly;
  paidAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─── Review ───────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  rating: number;
  text: string;
  authorName: string;
  aspects: string | null;
  approved: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─── User (admin staff) ───────────────────────────────────────────────────
export interface UserAdminProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  permissions: string;
  lastLogin: ISODateTime | null;
  createdAt: ISODateTime;
}

// ─── Extra (insurance / equipment / service / addon) ──────────────────────
export type ExtraCategory = "insurance" | "equipment" | "service" | "addon";
export type ExtraPriceType = "per_day" | "per_rental" | "one_time";

export interface Extra {
  id: string;
  code: string;
  nameSq: string;
  nameEn: string;
  descriptionSq?: string | null;
  descriptionEn?: string | null;
  category: ExtraCategory;
  price: number;
  priceType: ExtraPriceType;
  icon?: string | null;
  maxQuantity: number;
  isActive: boolean;
  sortOrder: number;
}

// ─── Blog post ────────────────────────────────────────────────────────────
export interface BlogPost {
  id: string;
  titleSq: string;
  titleEn: string;
  slug: string;
  excerptSq: string;
  excerptEn: string;
  contentSq: string;
  contentEn: string;
  coverImage: string;
  tags: string;
  status: "draft" | "published";
  publishedAt: ISODateTime;
  metaTitleSq: string;
  metaTitleEn: string;
  metaDescSq: string;
  metaDescEn: string;
}

// ─── Activity log ─────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  ipAddress?: string;
  timestamp: ISODateTime;
}

// ─── Customer document ────────────────────────────────────────────────────
export interface CustomerDocument {
  id: string;
  customerId: string;
  documentType: string;
  fileUrl: string;
  expiryDate?: DateOnly | null;
  createdAt: ISODateTime;
}

// ─── Communication log ────────────────────────────────────────────────────
export interface CommunicationLog {
  id: string;
  customerId: string;
  type: "Email" | "SMS" | "Call";
  subject: string;
  content: string;
  timestamp: ISODateTime;
}

// ─── Chat message ─────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  conversationId: string;
  text: string;
  isFromAdmin: boolean;
  createdAt: ISODateTime;
}

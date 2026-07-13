// Shared enum-like constants for entity statuses.
// Use these instead of hardcoding strings — typos become compile-time errors.

import type {
  ReservationStatus,
  CarStatus,
  CustomerType,
  ScoringTier,
  UserRole,
} from "../types";

export const RESERVATION_STATUSES = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const satisfies Record<string, ReservationStatus>;

export const RESERVATION_STATUS_VALUES: ReservationStatus[] = [
  "Pending",
  "Confirmed",
  "Active",
  "Completed",
  "Cancelled",
];

// Reservations in these statuses block the car from being rented again.
export const BLOCKING_RESERVATION_STATUSES: ReservationStatus[] = [
  "Pending",
  "Confirmed",
  "Active",
];

export const CAR_STATUSES = {
  AVAILABLE: "Në dispozicion",
  RESERVED: "I rezervuar",
  MAINTENANCE: "Në mirëmbajtje",
} as const satisfies Record<string, CarStatus>;

export const CAR_STATUS_VALUES: CarStatus[] = [
  "Në dispozicion",
  "I rezervuar",
  "Në mirëmbajtje",
];

export const CUSTOMER_TYPES = {
  STANDARD: "Standard",
  VIP: "VIP",
  CORPORATE: "Korporatë",
} as const satisfies Record<string, CustomerType>;

export const CUSTOMER_TYPE_VALUES: CustomerType[] = ["Standard", "VIP", "Korporatë"];

export const SCORING_TIERS_LIST: ScoringTier[] = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
];

export const USER_ROLES_LIST: UserRole[] = [
  "admin",
  "manager",
  "staff",
  "accountant",
  "customer",
];

// Localized labels for UI rendering — kept here so the source of truth for both
// the value and the human-readable label is in one place.
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  Pending: "Në pritje",
  Confirmed: "Konfirmuar",
  Active: "Aktive",
  Completed: "Përfunduar",
  Cancelled: "Anuluar",
};

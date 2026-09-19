import { SupportedState } from './user';

export type QuotationStatus = 'OPEN' | 'IN_REVIEW' | 'AWARDED' | 'CANCELLED';

export interface QuotationItem {
  id?: string;
  quotationId?: string;
  categoryId?: string;
  categoryName?: string;
  productName: string;
  activeIngredient?: string;
  quantity: number;
  unit: string;
  acceptsGeneric?: boolean;
}

export interface QuotationRequest {
  id: string;
  producerId: string;
  producerName?: string;
  deliveryAddress?: string;
  title: string;
  status: QuotationStatus;
  targetState: SupportedState;
  targetCity: string;
  deadline: string;
  freightType?: FreightType;
  paymentTerms?: string;
  proposalLimitHours?: number;
  displayCode?: string;
  notes?: string;
  agronomicWindow?: string;
  applicationDeadlineDays?: number;
  items?: QuotationItem[];
  itemsCount?: number;
  bidsCount?: number;
  bestBidAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationMetrics {
  openCount: number;
  inReviewCount: number;
  awardedCount: number;
  totalCount: number;
}

export type TargetCropId =
  | 'cafe_conilon'
  | 'cafe_arabica'
  | 'cacau'
  | 'pimenta_reino'
  | 'mamao';

export interface TargetCropInfo {
  id: TargetCropId;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
}

export interface ProducerFarm {
  id: string;
  name: string;
  city: string;
  state: SupportedState;
}

export interface RecipeAttachment {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  dataUrl?: string;
}

export type FreightType = 'CIF' | 'FOB';

export interface QuotationNotification {
  id: string;
  quotationId: string;
  quotationCode?: string;
  resellerId?: string;
  resellerName?: string;
  targetCity: string;
  targetState: SupportedState;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface QuotationDraft {
  farmId?: string;
  farmName?: string;
  targetCity?: string;
  targetState?: SupportedState;
  targetCrop?: TargetCropId;
  targetCropName?: string;
  items?: QuotationItem[];
  prescription?: RecipeAttachment;
  freightType?: FreightType;
  paymentTerms?: string;
  proposalLimitHours?: number;
  title?: string;
  notes?: string;
  talhaoArea?: number;
  talhaoSpacing?: number;
  updatedAt?: string;
}

export interface QuotationBidItem {
  id: string;
  bidId?: string;
  quotationItemId?: string;
  productName: string;
  brandName: string;
  unitPrice: number;
  totalPrice: number;
  isEquivalent?: boolean;
  activeIngredientConcentration?: string;
  isAwarded?: boolean;
  notes?: string;
}

export type BidAwardType = 'NONE' | 'FULL' | 'PARTIAL';
export type BidStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_ACCEPTED';

export interface QuotationBid {
  id: string;
  quotationId: string;
  resellerId: string;
  resellerName: string;
  resellerTradeName?: string;
  resellerCity: string;
  resellerState: SupportedState;
  rtvName?: string;
  rtvPhone?: string;
  items: QuotationBidItem[];
  freightCost: number;
  deliveryDays: number;
  totalAmount: number;
  status: BidStatus;
  awardType?: BidAwardType;
  paymentMethod?: 'CASH' | 'TERM_HARVEST' | 'BARTER' | 'STANDARD' | string;
  paymentTerms?: string;
  cashDiscountPercent?: number;
  cashPriceTotal?: number;
  termPriceTotal?: number;
  interestRateMonthly?: number;
  validityHours?: number;
  barterBagsCount?: number;
  notes?: string;
  createdAt: string;
}

export interface ComparativeAnalysis {
  quotation: QuotationRequest;
  bids: QuotationBid[];
  bestPriceBidId: string | null;
  fastestDeliveryBidId: string | null;
}

export interface AwardedResellerSummary {
  bidId: string;
  resellerId: string;
  resellerName: string;
  resellerTradeName?: string;
  rtvName: string;
  rtvPhone: string;
  awardedItems: QuotationBidItem[];
  subtotal: number;
  freightCost: number;
  totalAmount: number;
  whatsAppUrl: string;
}

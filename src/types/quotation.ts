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
  title: string;
  status: QuotationStatus;
  targetState: SupportedState;
  targetCity: string;
  deadline: string;
  notes?: string;
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

export interface QuotationDraft {
  farmId?: string;
  farmName?: string;
  targetCity?: string;
  targetState?: SupportedState;
  targetCrop?: TargetCropId;
  targetCropName?: string;
  items?: QuotationItem[];
  prescription?: RecipeAttachment;
  title?: string;
  notes?: string;
  updatedAt?: string;
}


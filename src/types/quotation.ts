import { SupportedState } from './user';

export type QuotationStatus = 'OPEN' | 'IN_REVIEW' | 'AWARDED' | 'CANCELLED';

export interface QuotationItem {
  id?: string;
  quotationId?: string;
  categoryId?: string;
  categoryName?: string;
  productName: string;
  quantity: number;
  unit: string;
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

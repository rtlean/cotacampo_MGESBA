export type UserRole = 'PRODUCER' | 'RESELLER';

export type SupportedState = 'MG' | 'ES' | 'BA';

export type CropId =
  | 'cafe'
  | 'cafe_conilon'
  | 'cafe_arabica'
  | 'cacau'
  | 'pimenta'
  | 'pimenta_reino'
  | 'mamao';

export type FarmScale = 'PEQUENA' | 'MEDIA' | 'GRANDE';

export interface CropDimensionInput {
  area: string;
  plantsCount?: string;
}

export interface CropDimensionData {
  cropId: CropId;
  plantedAreaHectares: number;
  plantsCount?: number;
  scale: FarmScale;
}

export interface CropInfo {
  id: CropId;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export type SupplyCategoryId =
  | 'defensivos'
  | 'fertilizantes'
  | 'foliares'
  | 'biologicos'
  | 'corretivos';

export interface SupplyCategoryInfo {
  id: SupplyCategoryId;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export interface ProducerProfile {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  password?: string;
  role: 'PRODUCER';
  farmName: string;
  state: SupportedState;
  city: string;
  crops: CropId[];
  cropDimensions?: Record<string, CropDimensionInput>;
  createdAt: string;
}

export interface ResellerProfile {
  id: string;
  role: 'RESELLER';
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  corporateEmail: string;
  whatsapp: string;
  password?: string;
  state: SupportedState;
  city: string;
  deliveryRadiusKm: number;
  coordinates: { lat: number; lng: number };
  categories: SupplyCategoryId[];
  createdAt: string;
}

export type UserProfile = ProducerProfile | ResellerProfile;

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  role?: UserRole;
  user?: UserProfile;
}

export interface RegisterFormData {
  role: UserRole;
  fullName: string;
  email: string;
  whatsapp: string;
  password: string;
  confirmPassword?: string;
  farmName: string;
  state: SupportedState | '';
  city: string;
  crops: CropId[];
  cropDimensions?: Record<string, CropDimensionInput>;
}

export interface ResellerFormData {
  role: 'RESELLER';
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  corporateEmail: string;
  whatsapp: string;
  password: string;
  state: SupportedState;
  city: string;
  deliveryRadiusKm: number;
  categories: SupplyCategoryId[];
}

export interface FormErrors {
  fullName?: string;
  email?: string;
  whatsapp?: string;
  password?: string;
  confirmPassword?: string;
  farmName?: string;
  state?: string;
  city?: string;
  crops?: string;
  [key: string]: string | undefined;
}

export interface ResellerFormErrors {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  corporateEmail?: string;
  whatsapp?: string;
  password?: string;
  state?: string;
  city?: string;
  deliveryRadiusKm?: string;
  categories?: string;
  general?: string;
}

export interface PasswordResetRequest {
  identifier: string;
}

export interface PasswordResetToken {
  token: string;
  code: string; // 6 dígitos numéricos
  identifier: string;
  userRole?: UserRole;
  expiresAt: string; // ISO String (15 minutos)
  used: boolean;
  createdAt: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  channel?: 'email' | 'whatsapp';
  code?: string;
  expiresAt?: string;
  resetToken?: string;
  resetUrl?: string;
  whatsappUrl?: string;
  deliveryStatus?: 'sent' | 'rate_limited' | 'error';
  errorMessage?: string;
}

export interface ResetPasswordInput {
  tokenOrCode: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}



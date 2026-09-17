export type UserRole = 'PRODUCER' | 'RESELLER';

export type SupportedState = 'MG' | 'ES' | 'BA';

export type CropId = 'cafe' | 'cacau' | 'pimenta' | 'mamao';

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
  expiresAt?: string;
  resetToken?: string;
  resetUrl?: string;
}


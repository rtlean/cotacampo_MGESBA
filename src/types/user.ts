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

export interface ProducerProfile {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  role: 'PRODUCER';
  farmName: string;
  state: SupportedState;
  city: string;
  crops: CropId[];
  createdAt: string;
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

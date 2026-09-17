import { SupportedState } from '../types/user';

export interface StateOption {
  code: SupportedState;
  name: string;
  focusCrops: string;
}

export const SUPPORTED_STATES: StateOption[] = [
  { code: 'ES', name: 'Espírito Santo', focusCrops: 'Café Conilon, Pimenta-do-reino, Cacau, Mamão' },
  { code: 'MG', name: 'Minas Gerais', focusCrops: 'Café Arábica e Conilon, Hortifruti' },
  { code: 'BA', name: 'Bahia', focusCrops: 'Cacau, Pimenta-do-reino, Mamão, Café' },
];

export const TOP_MUNICIPALITIES: Record<SupportedState, string[]> = {
  ES: [
    'Linhares',
    'São Mateus',
    'Jaguaré',
    'Colatina',
    'Nova Venécia',
    'Santa Maria de Jetibá',
    'Pinheiros',
    'Sooretama',
    'Rio Bananal',
    'Marilândia',
    'Aracruz',
    'Montanha',
    'Venda Nova do Imigrante',
    'Castelo',
    'Afonso Cláudio',
    'Vila Valério',
    'Cachoeiro de Itapemirim',
  ],
  MG: [
    'Manhuaçu',
    'Patrocínio',
    'Caratinga',
    'Alfenas',
    'Varginha',
    'Viçosa',
    'Guanhães',
    'Muriaé',
    'Teófilo Otoni',
    'Governador Valadares',
    'Esperança Nova',
    'Lajinha',
    'Mutum',
    'Ipanema',
  ],
  BA: [
    'Ilhéus',
    'Itabuna',
    'Gandu',
    'Eunápolis',
    'Teixeira de Freitas',
    'Porto Seguro',
    'Itamaraju',
    'Valença',
    'Ibirapitanga',
    'Wenceslau Guimarães',
    'Prado',
    'Nova Viçosa',
  ],
};

export const MUNICIPALITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Linhares: { lat: -19.3958, lng: -40.0644 },
  'São Mateus': { lat: -18.7161, lng: -39.8589 },
  Jaguaré: { lat: -18.9061, lng: -40.0761 },
  Colatina: { lat: -19.5392, lng: -40.6306 },
  'Nova Venécia': { lat: -18.7114, lng: -40.4006 },
  Manhuaçu: { lat: -20.2583, lng: -42.0336 },
  Patrocínio: { lat: -18.9439, lng: -46.9928 },
  Ilhéus: { lat: -14.7889, lng: -39.0494 },
  Itabuna: { lat: -14.7936, lng: -39.2789 },
  Gandu: { lat: -13.7439, lng: -39.4867 },
};

export const getCityCoordinates = (
  city: string,
  state?: SupportedState
): { lat: number; lng: number } => {
  if (MUNICIPALITY_COORDINATES[city]) {
    return MUNICIPALITY_COORDINATES[city];
  }
  if (state === 'ES') return { lat: -19.3958, lng: -40.0644 };
  if (state === 'MG') return { lat: -19.9167, lng: -43.9345 };
  if (state === 'BA') return { lat: -12.9777, lng: -38.5016 };
  return { lat: -19.3958, lng: -40.0644 };
};

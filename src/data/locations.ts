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

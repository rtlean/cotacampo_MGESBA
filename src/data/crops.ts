import { CropInfo, CropId } from '../types/user';

export const CROPS: CropInfo[] = [
  {
    id: 'cafe_conilon',
    name: 'Café Conilon',
    subtitle: 'Robusta Tropical',
    icon: '☕',
    color: '#78350F',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    borderColor: 'border-amber-600',
  },
  {
    id: 'cafe_arabica',
    name: 'Café Arábica',
    subtitle: 'Variedades de Altitude',
    icon: '☕',
    color: '#92400E',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    borderColor: 'border-amber-600',
  },
  {
    id: 'cacau',
    name: 'Cacau',
    subtitle: 'Cabruca e Pleno Sol',
    icon: '🍫',
    color: '#713F12',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    borderColor: 'border-orange-600',
  },
  {
    id: 'pimenta',
    name: 'Pimenta-do-reino',
    subtitle: 'Preta e Branca',
    icon: '🌿',
    color: '#166534',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    borderColor: 'border-emerald-600',
  },
  {
    id: 'mamao',
    name: 'Mamão',
    subtitle: 'Papaya e Formosa',
    icon: '🍈',
    color: '#C2410C',
    badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    borderColor: 'border-yellow-600',
  },
];

export function getCropName(id: CropId | string): string {
  switch (id) {
    case 'cafe_conilon':
      return 'Café Conilon';
    case 'cafe_arabica':
      return 'Café Arábica';
    case 'cafe':
      return 'Café';
    case 'cacau':
      return 'Cacau';
    case 'pimenta':
    case 'pimenta_reino':
      return 'Pimenta-do-reino';
    case 'mamao':
      return 'Mamão';
    default:
      return id;
  }
}

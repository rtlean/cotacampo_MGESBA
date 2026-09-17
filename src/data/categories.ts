import { SupplyCategoryInfo } from '../types/user';

export const SUPPLY_CATEGORIES: SupplyCategoryInfo[] = [
  {
    id: 'defensivos',
    name: 'Defensivos',
    subtitle: 'Químicos e Proteção de Cultivos',
    icon: '🛡️',
    color: '#0284C7',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    borderColor: 'border-sky-600',
  },
  {
    id: 'fertilizantes',
    name: 'Fertilizantes e Nutrição',
    subtitle: 'NPK, Adubos e Solo',
    icon: '🌱',
    color: '#16A34A',
    badgeBg: 'bg-green-100 text-green-900 border-green-300',
    borderColor: 'border-green-600',
  },
  {
    id: 'foliares',
    name: 'Foliares',
    subtitle: 'Nutrição Foliar e Bioestimulantes',
    icon: '💧',
    color: '#2563EB',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    borderColor: 'border-blue-600',
  },
  {
    id: 'biologicos',
    name: 'Biológicos',
    subtitle: 'Inoculantes e Controle Biológico',
    icon: '🐞',
    color: '#059669',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    borderColor: 'border-emerald-600',
  },
  {
    id: 'corretivos',
    name: 'Corretivos',
    subtitle: 'Calcário, Gesso e Condicionadores',
    icon: '⛰️',
    color: '#D97706',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    borderColor: 'border-amber-600',
  },
];

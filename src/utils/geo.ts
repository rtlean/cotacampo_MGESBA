import { SupportedState } from '../types/user';
import { getCityCoordinates } from '../data/locations';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Raio médio da Terra em quilômetros
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Converte graus para radianos
 */
export const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Calcula a distância em quilômetros entre dois pontos geográficos usando a fórmula de Haversine
 */
export const calculateDistanceKm = (c1: Coordinates, c2: Coordinates): number => {
  if (c1.lat === c2.lat && c1.lng === c2.lng) {
    return 0;
  }

  const dLat = toRadians(c2.lat - c1.lat);
  const dLng = toRadians(c2.lng - c1.lng);

  const lat1 = toRadians(c1.lat);
  const lat2 = toRadians(c2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 10) / 10;
};

/**
 * Calcula a distância estimada em km entre dois municípios
 */
export const getCityDistanceKm = (
  city1: string,
  state1: SupportedState,
  city2: string,
  state2: SupportedState
): number => {
  if (city1.trim().toLowerCase() === city2.trim().toLowerCase() && state1 === state2) {
    return 0;
  }

  const coord1 = getCityCoordinates(city1, state1);
  const coord2 = getCityCoordinates(city2, state2);

  return calculateDistanceKm(coord1, coord2);
};

/**
 * Formata a distância para exibição amigável (ex: "18 km" ou "78.5 km")
 */
export const formatDistance = (km: number): string => {
  if (km === 0) {
    return '0 km (Mesmo município)';
  }
  const rounded = Math.round(km);
  return `${rounded} km`;
};

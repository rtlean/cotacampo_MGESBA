import { describe, it, expect } from 'vitest';
import {
  calculateDistanceKm,
  getCityDistanceKm,
  formatDistance,
  toRadians,
} from '../geo';

describe('geo - Utilitário de Distâncias Geodésicas (US13)', () => {
  describe('toRadians', () => {
    it('deve converter graus em radianos corretamente', () => {
      expect(toRadians(0)).toBe(0);
      expect(toRadians(180)).toBeCloseTo(Math.PI, 5);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 5);
    });
  });

  describe('calculateDistanceKm', () => {
    it('deve retornar 0 para pontos idênticos', () => {
      const p = { lat: -19.3958, lng: -40.0644 };
      expect(calculateDistanceKm(p, p)).toBe(0);
    });

    it('deve calcular a distância real entre Linhares e São Mateus (~78 km)', () => {
      const linhares = { lat: -19.3958, lng: -40.0644 };
      const saoMateus = { lat: -18.7161, lng: -39.8589 };
      const dist = calculateDistanceKm(linhares, saoMateus);
      expect(dist).toBeGreaterThan(70);
      expect(dist).toBeLessThan(85);
    });

    it('deve calcular a distância real entre Linhares e Colatina (~62 km)', () => {
      const linhares = { lat: -19.3958, lng: -40.0644 };
      const colatina = { lat: -19.5392, lng: -40.6306 };
      const dist = calculateDistanceKm(linhares, colatina);
      expect(dist).toBeGreaterThan(55);
      expect(dist).toBeLessThan(70);
    });
  });

  describe('getCityDistanceKm', () => {
    it('deve retornar 0 quando ambas as cidades forem idênticas (mesmo nome e estado)', () => {
      expect(getCityDistanceKm('Linhares', 'ES', 'Linhares', 'ES')).toBe(0);
      expect(getCityDistanceKm('  linhares  ', 'ES', 'Linhares', 'ES')).toBe(0);
    });

    it('deve calcular a distância entre municípios mapeados no ES', () => {
      const distLinharesSaoMateus = getCityDistanceKm('Linhares', 'ES', 'São Mateus', 'ES');
      expect(distLinharesSaoMateus).toBeGreaterThan(70);
      expect(distLinharesSaoMateus).toBeLessThan(85);

      const distLinharesColatina = getCityDistanceKm('Linhares', 'ES', 'Colatina', 'ES');
      expect(distLinharesColatina).toBeGreaterThan(55);
      expect(distLinharesColatina).toBeLessThan(70);
    });

    it('deve calcular distância interestadual (Linhares/ES até Manhuaçu/MG > 200 km)', () => {
      const dist = getCityDistanceKm('Linhares', 'ES', 'Manhuaçu', 'MG');
      expect(dist).toBeGreaterThan(200);
    });

    it('deve usar fallback de coordenadas para cidades não mapeadas expressamente', () => {
      const dist = getCityDistanceKm('Cidade Não Cadastrada', 'ES', 'Outra Cidade', 'MG');
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe('formatDistance', () => {
    it('deve formatar distância zero com texto amigável', () => {
      expect(formatDistance(0)).toBe('0 km (Mesmo município)');
    });

    it('deve formatar valores arredondados para quilômetros inteiros', () => {
      expect(formatDistance(18.2)).toBe('18 km');
      expect(formatDistance(78.9)).toBe('79 km');
    });
  });
});

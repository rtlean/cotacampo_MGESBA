import { describe, it, expect } from 'vitest';
import { getCityCoordinates, SUPPORTED_STATES, TOP_MUNICIPALITIES } from '../locations';

describe('Locations Data & Utility', () => {
  it('deve conter os estados suportados MG, ES e BA', () => {
    const codes = SUPPORTED_STATES.map((s) => s.code);
    expect(codes).toContain('ES');
    expect(codes).toContain('MG');
    expect(codes).toContain('BA');
  });

  it('deve retornar lista de municípios para cada estado suportado', () => {
    expect(TOP_MUNICIPALITIES.ES.length).toBeGreaterThan(0);
    expect(TOP_MUNICIPALITIES.MG.length).toBeGreaterThan(0);
    expect(TOP_MUNICIPALITIES.BA.length).toBeGreaterThan(0);
  });

  it('deve retornar coordenadas exatas de cidades cadastradas', () => {
    expect(getCityCoordinates('Linhares')).toEqual({ lat: -19.3958, lng: -40.0644 });
    expect(getCityCoordinates('Manhuaçu')).toEqual({ lat: -20.2583, lng: -42.0336 });
    expect(getCityCoordinates('Ilhéus')).toEqual({ lat: -14.7889, lng: -39.0494 });
  });

  it('deve retornar coordenadas de fallback por estado para cidades não cadastradas', () => {
    expect(getCityCoordinates('Cidade Desconhecida', 'ES')).toEqual({ lat: -19.3958, lng: -40.0644 });
    expect(getCityCoordinates('Cidade Desconhecida', 'MG')).toEqual({ lat: -19.9167, lng: -43.9345 });
    expect(getCityCoordinates('Cidade Desconhecida', 'BA')).toEqual({ lat: -12.9777, lng: -38.5016 });
    expect(getCityCoordinates('Cidade Desconhecida')).toEqual({ lat: -19.3958, lng: -40.0644 });
  });
});

/**
 * Utilitários para limpeza, validação e formatação de CNPJ brasileiro
 */

export const cleanCNPJ = (value: string): string => {
  return (value || '').replace(/\D/g, '');
};

export const validateCNPJ = (value: string): boolean => {
  const digits = cleanCNPJ(value);

  if (digits.length !== 14) return false;

  // Rejeita sequências de dígitos idênticos (ex: 00000000000000, 11111111111111)
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // Cálculo do 1º dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(digits[i], 10) * weights1[i];
  }
  const mod1 = sum1 % 11;
  const expectedDigit1 = mod1 < 2 ? 0 : 11 - mod1;

  if (parseInt(digits[12], 10) !== expectedDigit1) return false;

  // Cálculo do 2º dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits[i], 10) * weights2[i];
  }
  const mod2 = sum2 % 11;
  const expectedDigit2 = mod2 < 2 ? 0 : 11 - mod2;

  return parseInt(digits[13], 10) === expectedDigit2;
};

export const formatCNPJ = (value: string): string => {
  const digits = cleanCNPJ(value).slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

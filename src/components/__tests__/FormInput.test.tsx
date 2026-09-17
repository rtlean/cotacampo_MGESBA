import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { FormInput } from '../FormInput';

describe('FormInput Component', () => {
  it('deve renderizar o label e indicar obrigatoriedade quando required=true', () => {
    render(<FormInput label="Nome Completo" required id="fullName" />);
    expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('deve associar aria-invalid e mensagem de erro acessível com role=alert', () => {
    render(
      <FormInput
        label="E-mail"
        id="email"
        error="Formato de e-mail inválido"
      />
    );
    const input = screen.getByLabelText(/E-mail/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');

    const alertMsg = screen.getByRole('alert');
    expect(alertMsg).toHaveTextContent('Formato de e-mail inválido');
  });

  it('deve encaminhar a ref corretamente e suportar focus programático', () => {
    const inputRef = createRef<HTMLInputElement>();
    render(<FormInput ref={inputRef} label="WhatsApp" id="whatsapp" />);

    expect(inputRef.current).not.toBeNull();
    inputRef.current?.focus();
    expect(document.activeElement).toBe(inputRef.current);
  });
});

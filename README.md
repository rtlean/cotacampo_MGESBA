# CotaCampo (MG • ES • BA)

Plataforma digital de cotação inteligente de insumos agrícolas para produtores de **Café**, **Cacau**, **Pimenta-do-reino** e **Mamão** nos estados de **Minas Gerais (MG)**, **Espírito Santo (ES)** e **Bahia (BA)**.

- **Repositório GitHub:** [https://github.com/rtlean/cotacampo_MGESBA.git](https://github.com/rtlean/cotacampo_MGESBA.git)
- **Deploy Vercel:** [https://cotacampo-es-36ja.vercel.app/](https://cotacampo-es-36ja.vercel.app/)

---

## Histórias de Usuário Implementadas

### US01 – Cadastro do Produtor Rural
- **Alternância de Perfil:** Produtor Rural vs Revenda.
- **Validação Completa de Formulário:**
  - Nome Completo
  - E-mail
  - WhatsApp com máscara dinâmica `(XX) 9XXXX-XXXX`
  - Senha segura com indicador de força
  - Nome da Fazenda / Propriedade
  - Estado (MG, ES, BA)
  - Município (com base nas regiões agrícolas dos 3 estados)
  - Seleção interativa de culturas (Café, Cacau, Pimenta-do-reino, Mamão)
- **Acessibilidade e Foco:** Movimentação automática do cursor para o primeiro campo com erro em submissões inválidas (Cenário 2).
- **Ativação e Boas-vindas:** Autenticação imediata como perfil `PRODUCER`, redirecionamento para `/produtor/dashboard` e exibição de notificação e modal orientativo para criação da primeira cotação (Cenário 1).

---

## Scripts Disponíveis

```bash
# Instalação das dependências
npm install

# Execução em modo de desenvolvimento
npm run dev

# Validação e Build para Produção
npm run build

# Execução dos Testes Automatizados (Vitest + Testing Library)
npm test

# Visualização do bundle de produção
npm run preview
```

---

## Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS + Google Fonts (*Fraunces* e *Work Sans*)
- **Ícones:** Lucide React
- **Roteamento:** Wouter (compatível com `vercel.json` SPA rewrites)
- **Testes:** Vitest + React Testing Library + JSDOM

# Gestão de Contratos NAUE - Frontend

![Angular](https://img.shields.io/badge/Angular-20-dd0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/Licença-Privado-red)

Sistema de gestão de contratos, propostas, mentorias e recrutamento da **Consultoria NAUE**. Interface web construída com Angular 20 e componentes standalone.

---

## Funcionalidades

- **Dashboard** com indicadores e gráficos (Chart.js)
- **Gestão de Clientes** (PF/PJ) com anexos, e-mails e telefones múltiplos
- **Propostas** com link público para assinatura, termos configuráveis e conversão para contrato
- **Contratos** com serviços, etapas, rotinas, comentários e anexos
- **Mentorias** com encontros públicos, ferramentas interativas (Roda da Vida, Mapa Mental, Modelo ABC, SWOT, Golden Circle, etc.)
- **Recrutamento & Seleção** com vagas, candidatos, entrevistas e hub público de vagas
- **Planejamento Estratégico** com departamentos, SWOT, OKRs e árvore de problemas
- **Relatórios** com exportação em PDF, DOCX e Excel
- **Notificações** em tempo real
- **Controle de acesso** por papéis e permissões

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 18.x
- [Angular CLI](https://angular.dev/tools/cli) >= 20.x
- Backend rodando em `http://localhost:3000` (ver [gestao-contratos-backend](../gestao-contratos-backend/README.md))

## Instalação

```bash
# Clonar o repositório e entrar no diretório
cd gestao-contratos

# Instalar dependências
npm install
```

## Executando

```bash
# Servidor de desenvolvimento (http://localhost:4200)
npm start

# Build de produção
npm run build

# Build de desenvolvimento
npm run build:development

# Testes unitários
npm test
```

## Estrutura do Projeto

```
src/
├── app/
│   ├── components/          # Componentes reutilizáveis (74 componentes)
│   │   ├── analytics-page/
│   │   ├── clients-table/
│   │   ├── contract-view-page/
│   │   ├── mentoria-editor/
│   │   ├── planejamento-estrategico-page/
│   │   ├── proposal-form/
│   │   ├── sidebar/
│   │   └── ...
│   ├── pages/               # Páginas de rota (24 páginas)
│   │   ├── home/
│   │   ├── login/
│   │   ├── public-mentoria-view/
│   │   ├── public-proposal-view/
│   │   ├── public-vagas-hub/
│   │   └── ...
│   ├── services/            # Serviços Angular (40 serviços)
│   │   ├── auth.ts
│   │   ├── contract.service.ts
│   │   ├── mentoria.service.ts
│   │   ├── vaga.service.ts
│   │   └── ...
│   ├── guards/              # Guards de rota (autenticação)
│   ├── interceptors/        # Interceptors HTTP
│   ├── directives/          # Diretivas customizadas
│   └── types/               # Definições de tipos TypeScript
├── environments/
│   ├── environment.ts       # Config desenvolvimento (localhost:3000)
│   └── environment.prod.ts  # Config produção (Render)
└── styles.css               # Estilos globais
```

## Principais Bibliotecas

| Biblioteca | Uso |
|---|---|
| **Chart.js** | Gráficos do dashboard e analytics |
| **docx** | Geração de documentos Word |
| **jspdf** + **html2canvas** | Exportação em PDF |
| **xlsx-js-style** | Exportação em Excel com formatação |
| **ngx-toastr** | Notificações toast |
| **ngx-editor** / **TipTap** | Editor rich text (mentorias) |
| **CKEditor 5** | Editor de conteúdo avançado |
| **pdfjs-dist** | Visualização de PDFs |

## Configuração de Ambiente

O frontend se comunica com o backend via variáveis em `src/environments/`:

```typescript
// environment.ts (desenvolvimento)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  authUrl: 'http://localhost:3000/api/auth'
};
```

## Gerando Componentes

```bash
# Novo componente
ng generate component components/nome-componente

# Novo serviço
ng generate service services/nome-servico

# Novo guard
ng generate guard guards/nome-guard
```

## Deploy

O frontend é buildado e servido como aplicação estática. O build de produção gera os arquivos em `dist/`:

```bash
npm run build
```

---

Desenvolvido por **Consultoria NAUE**

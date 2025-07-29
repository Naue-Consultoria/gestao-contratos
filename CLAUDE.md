# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a contract management system built with Angular 20 for NAUE Consultoria. It's a frontend-only SPA that communicates with a separate backend API hosted on Render.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:4200)
npm start

# Build for production
npm run build:production

# Run tests
npm test

# Watch mode for development
npm run watch
```

## Architecture Overview

### API Configuration
- **Development**: http://localhost:3000/api
- **Production**: https://gestao-contratos-backend-46ru.onrender.com/api
- Configuration in `src/environments/`

### Authentication Flow
- JWT-based authentication with tokens stored in localStorage
- Auth interceptor automatically adds Bearer token to requests (src/app/interceptors/auth.interceptor.ts)
- Role-based access: Admin and User roles
- Must-change-password guard forces password change on first login

### Key Services
- **AuthService** (src/app/services/auth.ts): Authentication and token management
- **ContractService** (src/app/services/contract.ts): Contract CRUD operations
- **CompanyService** (src/app/services/company.ts): Company management
- **ServiceService** (src/app/services/service.ts): Service management
- **UserService** (src/app/services/user.ts): User management (admin only)

### Routing Structure
- Public routes: /login, /forgot-password
- Protected routes: All other routes require authentication
- Admin-only routes: /users, /new-user

### Important Business Logic

1. **Contract Types**: Full, Pontual, Individual
2. **Monetary Values**: All values are stored in cents (centavos) - multiply by 100 when sending to API
3. **Date Format**: ISO format for all date fields
4. **Language**: Portuguese (Brazilian)

### Common Development Tasks

To add a new feature:
1. Create component in appropriate directory (components/ for shared, pages/ for route components)
2. Add service methods in services/ if API interaction needed
3. Update app.routes.ts if new route required
4. Add auth guard if route needs protection

To modify API calls:
1. Update the service file in src/app/services/
2. Check type definitions in src/app/types/
3. Update environment URLs if needed

### Testing Approach

The project uses Karma and Jasmine for testing. Run tests with `npm test`.

## Code Style Guidelines

- Use strict TypeScript types (avoid `any`)
- Follow Angular style guide conventions
- Services handle all API communication
- Components should be focused on presentation logic
- Use RxJS observables for async operations
- Handle errors with ngx-toastr notifications

## Key Dependencies

- Angular 20.0.x
- TypeScript 5.8.2
- RxJS 7.8.0
- ngx-toastr 19.0.0 (notifications)
- Chart.js 4.5.0 (analytics)
- ExcelJS 4.4.0 (Excel export)
- PDFKit 0.17.1 (PDF generation)
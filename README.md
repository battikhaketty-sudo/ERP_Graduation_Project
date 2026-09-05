# HR / ERP System (Frontend)

واجهة أمامية عربية (RTL) لنظام موارد بشرية متصل بـ REST API.

## Tech Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS
- Axios + React Router

## Quick Start

```bash
npm install
npm run dev
```

يفتح التطبيق على `http://localhost:5173` ويوجّه طلبات `/api/*` إلى السيرفر عبر Vite proxy.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api/v1` | Base path for API calls (proxy in dev) |
| `VITE_API_PROXY_TARGET` | `http://mag-erp-system.runasp.net` | Upstream server for Vite proxy |
| `VITE_API_HOST` | `http://mag-erp-system.runasp.net` | Public API host (docs links) |

Configuration is centralized in `src/config/env.ts`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with HMR |
| `npm run build` | Type-check + production build |
| `npm run typecheck` | TypeScript validation only |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── config/           # Environment & app configuration
├── constants/        # Shared constants (API URLs, defaults)
├── types/            # Domain TypeScript types
├── services/
│   ├── api.ts        # Axios instance + interceptors
│   ├── authApi.ts    # Authentication
│   ├── hrApi.ts      # Departments, contracts, attendance, skills
│   └── employees/    # Employee CRUD (mapper, form builder, service)
├── hooks/            # Reusable React hooks
├── components/
│   ├── ui/           # Shared UI primitives (PageHeader, FormField, …)
│   ├── employees/    # Employee feature components
│   ├── departments/  # Department feature components
│   └── projects/     # Project & invitation management
├── pages/            # Route-level pages
├── layouts/          # App shell
├── context/          # UI context (toast, preferences, dialogs)
├── auth/             # Session loaders and route guards
└── utils/            # API response helpers
```

## Architecture Notes

- **Services layer**: HTTP calls live in `services/`. Employee logic is split into `mapper`, `form`, and `service` for clarity.
- **Types**: Domain models in `src/types/`; `hrApi.ts` re-exports them for backward compatibility.
- **Forms with files**: Employee create/update uses `FormData`; the Axios interceptor removes `Content-Type` so the browser sets the multipart boundary.
- **Delete employee**: Backend exposes `POST /employees/{id}/archive` (no HTTP DELETE).
- **Reference data**: Modals use `useReferenceOptions` to load departments, contract types, and/or employees on demand.
- **Project management**: `/projects` uses the live REST API for projects, invitations, tasks, and sections.

## Authentication

Login stores the JWT in `localStorage`. Route loaders in `src/auth` require an active session before rendering protected pages.

## API Documentation

- Scalar UI: `http://mag-erp-system.runasp.net/scalar/`
- OpenAPI: `http://mag-erp-system.runasp.net/openapi/v1.json`

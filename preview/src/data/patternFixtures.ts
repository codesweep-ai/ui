import type { TreeNode } from "@codesweep-ai/ui";

// ── Explorer fixtures ──────────────────────────────────────

export const explorerTree: TreeNode[] = [
  {
    id: "docs",
    name: "docs",
    type: "branch",
    children: [
      { id: "docs/intro", name: "introduction.md", type: "leaf" },
      { id: "docs/getting-started", name: "getting-started.md", type: "leaf" },
      { id: "docs/faq", name: "faq.md", type: "leaf" },
    ],
  },
  {
    id: "api",
    name: "api-reference",
    type: "branch",
    children: [
      { id: "api/auth", name: "authentication.md", type: "leaf" },
      { id: "api/endpoints", name: "endpoints.md", type: "leaf" },
      { id: "api/errors", name: "error-codes.md", type: "leaf" },
    ],
  },
  {
    id: "guides",
    name: "guides",
    type: "branch",
    children: [
      { id: "guides/deploy", name: "deployment.md", type: "leaf" },
      { id: "guides/testing", name: "testing.md", type: "leaf" },
      { id: "guides/ci", name: "ci-cd.md", type: "leaf" },
    ],
  },
];

export const explorerContent: Record<string, { title: string; body: string }> =
  {
    "docs/intro": {
      title: "Introduction",
      body: "Welcome to the project documentation. This guide covers the architecture, conventions, and APIs you need to build on top of the platform.\n\nThe system is organised into three layers: core, services, and presentation. Each layer has clear boundaries and a well-defined API surface.",
    },
    "docs/getting-started": {
      title: "Getting Started",
      body: "1. Clone the repository\n2. Install dependencies with `npm install`\n3. Copy `.env.example` to `.env`\n4. Run `npm run dev` to start the development server\n\nThe app will be available at http://localhost:3000.",
    },
    "docs/faq": {
      title: "Frequently Asked Questions",
      body: "Q: Which Node version is required?\nA: Node 18 or later.\n\nQ: Can I use yarn instead of npm?\nA: Yes — yarn and pnpm both work.\n\nQ: Where do I report bugs?\nA: Open an issue on the GitHub repository.",
    },
    "api/auth": {
      title: "Authentication",
      body: "All API requests require a Bearer token in the Authorization header.\n\nTokens are issued via POST /api/auth/login and expire after 24 hours. Use the refresh endpoint to obtain a new token without re-authenticating.",
    },
    "api/endpoints": {
      title: "Endpoints",
      body: "GET  /api/users       — List users\nGET  /api/users/:id   — Get user by ID\nPOST /api/users       — Create user\nPUT  /api/users/:id   — Update user\nDEL  /api/users/:id   — Delete user\n\nAll endpoints return JSON and use standard HTTP status codes.",
    },
    "api/errors": {
      title: "Error Codes",
      body: "400 Bad Request      — Invalid input\n401 Unauthorized     — Missing or expired token\n403 Forbidden        — Insufficient permissions\n404 Not Found        — Resource does not exist\n429 Too Many Requests— Rate limit exceeded\n500 Internal Error   — Unexpected server failure",
    },
    "guides/deploy": {
      title: "Deployment",
      body: "The recommended deployment target is a containerised environment (Docker + Kubernetes).\n\n1. Build the image: `docker build -t app .`\n2. Push to your registry\n3. Apply the k8s manifests in `deploy/`",
    },
    "guides/testing": {
      title: "Testing",
      body: "Run the full test suite with `npm test`.\n\nUnit tests live next to their source files (`*.test.ts`). Integration tests are in `tests/integration/`. Use `npm run test:cov` to generate a coverage report.",
    },
    "guides/ci": {
      title: "CI / CD",
      body: "The repository includes a GitHub Actions workflow at `.github/workflows/ci.yml`.\n\nOn every push: lint → type-check → test → build.\nOn merge to main: deploy to staging automatically.",
    },
  };

// ── Rich explorer fixtures (50+ nodes) ────────────────────

export const projectFilesTree: TreeNode[] = [
  {
    id: "pf-src",
    name: "src",
    type: "branch",
    children: [
      {
        id: "pf-src-components",
        name: "components",
        type: "branch",
        children: [
          {
            id: "pf-src-components-ui",
            name: "ui",
            type: "branch",
            children: [
              { id: "pf-button", name: "Button.tsx", type: "leaf" },
              { id: "pf-card", name: "Card.tsx", type: "leaf" },
              { id: "pf-modal", name: "Modal.tsx", type: "leaf" },
              { id: "pf-dropdown", name: "Dropdown.tsx", type: "leaf" },
              { id: "pf-badge", name: "Badge.tsx", type: "leaf" },
              { id: "pf-tooltip", name: "Tooltip.tsx", type: "leaf" },
            ],
          },
          {
            id: "pf-src-components-forms",
            name: "forms",
            type: "branch",
            children: [
              { id: "pf-input", name: "Input.tsx", type: "leaf" },
              { id: "pf-select", name: "Select.tsx", type: "leaf" },
              { id: "pf-checkbox", name: "Checkbox.tsx", type: "leaf" },
              { id: "pf-form", name: "Form.tsx", type: "leaf" },
            ],
          },
          {
            id: "pf-src-components-layout",
            name: "layout",
            type: "branch",
            children: [
              { id: "pf-header", name: "Header.tsx", type: "leaf" },
              { id: "pf-sidebar", name: "Sidebar.tsx", type: "leaf" },
              { id: "pf-footer", name: "Footer.tsx", type: "leaf" },
            ],
          },
        ],
      },
      {
        id: "pf-src-auth",
        name: "auth",
        type: "branch",
        children: [
          { id: "pf-login", name: "login.ts", type: "leaf" },
          { id: "pf-register", name: "register.ts", type: "leaf" },
          { id: "pf-session", name: "session.ts", type: "leaf" },
          { id: "pf-oauth", name: "oauth.ts", type: "leaf" },
        ],
      },
      {
        id: "pf-src-api",
        name: "api",
        type: "branch",
        children: [
          { id: "pf-api-client", name: "client.ts", type: "leaf" },
          { id: "pf-api-auth", name: "auth.ts", type: "leaf" },
          { id: "pf-api-users", name: "users.ts", type: "leaf" },
          { id: "pf-api-orders", name: "orders.ts", type: "leaf" },
        ],
      },
      {
        id: "pf-src-hooks",
        name: "hooks",
        type: "branch",
        children: [
              { id: "pf-current-user", name: "useCurrentUser.ts", type: "leaf" },
          { id: "pf-useform", name: "useForm.ts", type: "leaf" },
          { id: "pf-usetheme", name: "useTheme.ts", type: "leaf" },
        ],
      },
      {
        id: "pf-src-utils",
        name: "utils",
        type: "branch",
        children: [
          { id: "pf-format", name: "format.ts", type: "leaf" },
          { id: "pf-validate", name: "validate.ts", type: "leaf" },
          { id: "pf-cn", name: "cn.ts", type: "leaf" },
        ],
      },
      { id: "pf-app", name: "App.tsx", type: "leaf" },
      { id: "pf-main", name: "main.tsx", type: "leaf" },
    ],
  },
  {
    id: "pf-tests",
    name: "tests",
    type: "branch",
    children: [
      { id: "pf-test-auth", name: "auth.test.ts", type: "leaf" },
      { id: "pf-test-api", name: "api.test.ts", type: "leaf" },
      { id: "pf-test-utils", name: "utils.test.ts", type: "leaf" },
    ],
  },
  { id: "pf-package", name: "package.json", type: "leaf" },
  { id: "pf-tsconfig", name: "tsconfig.json", type: "leaf" },
  { id: "pf-readme", name: "README.md", type: "leaf" },
];

export const dependenciesTree: TreeNode[] = [
  {
    id: "dep-react",
    name: "react",
    type: "branch",
    children: [
      { id: "dep-react-dom", name: "react-dom", type: "leaf" },
      { id: "dep-react-router", name: "react-router", type: "leaf" },
      { id: "dep-react-query", name: "react-query", type: "leaf" },
    ],
  },
  {
    id: "dep-ui",
    name: "ui-libraries",
    type: "branch",
    children: [
      { id: "dep-lucide", name: "lucide-react", type: "leaf" },
      { id: "dep-tailwind", name: "tailwindcss", type: "leaf" },
      { id: "dep-clsx", name: "clsx", type: "leaf" },
      { id: "dep-tw-merge", name: "tailwind-merge", type: "leaf" },
    ],
  },
  {
    id: "dep-build",
    name: "build-tools",
    type: "branch",
    children: [
      { id: "dep-vite", name: "vite", type: "leaf" },
      { id: "dep-typescript", name: "typescript", type: "leaf" },
      { id: "dep-esbuild", name: "esbuild", type: "leaf" },
    ],
  },
  {
    id: "dep-testing",
    name: "testing",
    type: "branch",
    children: [
      { id: "dep-vitest", name: "vitest", type: "leaf" },
      { id: "dep-rtl", name: "@testing-library/react", type: "leaf" },
      { id: "dep-playwright", name: "playwright", type: "leaf" },
    ],
  },
  {
    id: "dep-lint",
    name: "linting",
    type: "branch",
    children: [
      { id: "dep-eslint", name: "eslint", type: "leaf" },
      { id: "dep-prettier", name: "prettier", type: "leaf" },
    ],
  },
];

export const explorerContentV2: Record<
  string,
  { title: string; body: string }
> = {
  // Project files
  "pf-button": {
    title: "Button.tsx",
    body: "Primary UI button component with variants: primary, secondary, danger, ghost, success, warning. Supports size (sm, md) and disabled state.",
  },
  "pf-card": {
    title: "Card.tsx",
    body: "Container component with optional header, supporting variants: default, muted, success, danger, tight.",
  },
  "pf-modal": {
    title: "Modal.tsx",
    body: "Dialog overlay with title, content area, and action footer. Closes on Escape, backdrop click, or close button.",
  },
  "pf-dropdown": {
    title: "Dropdown.tsx",
    body: "Select dropdown with keyboard navigation. Supports placeholder, disabled state, and custom option rendering.",
  },
  "pf-badge": {
    title: "Badge.tsx",
    body: "Status indicator badge with semantic colors: success, warning, error, neutral.",
  },
  "pf-tooltip": {
    title: "Tooltip.tsx",
    body: "Hover tooltip with configurable placement and delay.",
  },
  "pf-input": {
    title: "Input.tsx",
    body: "Text input with label, validation states, and helper text.",
  },
  "pf-select": {
    title: "Select.tsx",
    body: "Native select wrapper with consistent styling.",
  },
  "pf-checkbox": {
    title: "Checkbox.tsx",
    body: "Checkbox with label, indeterminate state, and group support.",
  },
  "pf-form": {
    title: "Form.tsx",
    body: "Form wrapper with validation, error summary, and submit handling.",
  },
  "pf-header": {
    title: "Header.tsx",
    body: "App header with navigation, branding, and action slots.",
  },
  "pf-sidebar": {
    title: "Sidebar.tsx",
    body: "Collapsible sidebar navigation with icon and text modes.",
  },
  "pf-footer": {
    title: "Footer.tsx",
    body: "Page footer with links, copyright, and version info.",
  },
  "pf-login": {
    title: "login.ts",
    body: "Handles user authentication via email/password. Issues JWT tokens with 24-hour expiry. Includes rate limiting and brute-force protection.",
  },
  "pf-register": {
    title: "register.ts",
    body: "User registration flow with email verification. Validates input, hashes passwords with bcrypt, and sends confirmation email.",
  },
  "pf-session": {
    title: "session.ts",
    body: "Session management: token refresh, session invalidation, and multi-device tracking.",
  },
  "pf-oauth": {
    title: "oauth.ts",
    body: "OAuth 2.0 provider integration for Google, GitHub, and Microsoft sign-in.",
  },
  "pf-api-client": {
    title: "client.ts",
    body: "HTTP client wrapper with interceptors, retry logic, and automatic token refresh.",
  },
  "pf-api-auth": {
    title: "api/auth.ts",
    body: "Auth API endpoints: login, register, refresh, logout.",
  },
  "pf-api-users": {
    title: "api/users.ts",
    body: "User CRUD endpoints: list, get, create, update, delete. Includes pagination and filtering.",
  },
  "pf-api-orders": {
    title: "api/orders.ts",
    body: "Order management endpoints with status tracking and webhook notifications.",
  },
  "pf-current-user": {
    title: "useCurrentUser.ts",
    body: "React hook providing authentication state, login/logout functions, and current user info.",
  },
  "pf-useform": {
    title: "useForm.ts",
    body: "Form state management hook with field validation, dirty tracking, and submit handling.",
  },
  "pf-usetheme": {
    title: "useTheme.ts",
    body: "Theme switching hook with system preference detection and localStorage persistence.",
  },
  "pf-format": {
    title: "format.ts",
    body: "Formatting utilities: dates, numbers, currencies, relative time.",
  },
  "pf-validate": {
    title: "validate.ts",
    body: "Validation helpers: email, URL, phone, required, minLength, maxLength, pattern.",
  },
  "pf-cn": {
    title: "cn.ts",
    body: "className merging utility combining clsx and tailwind-merge.",
  },
  "pf-app": {
    title: "App.tsx",
    body: "Root application component with routing, theme provider, and error boundary.",
  },
  "pf-main": {
    title: "main.tsx",
    body: "Application entry point. Renders App into the DOM root.",
  },
  "pf-test-auth": {
    title: "auth.test.ts",
    body: "Authentication test suite: login flows, token refresh, session management, error cases.",
  },
  "pf-test-api": {
    title: "api.test.ts",
    body: "API client tests: request interceptors, retry logic, error handling.",
  },
  "pf-test-utils": {
    title: "utils.test.ts",
    body: "Utility function tests: format, validate, cn.",
  },
  "pf-package": {
    title: "package.json",
    body: "Project manifest with dependencies, scripts, and configuration.",
  },
  "pf-tsconfig": {
    title: "tsconfig.json",
    body: "TypeScript configuration: strict mode, path aliases, module resolution.",
  },
  "pf-readme": {
    title: "README.md",
    body: "Project documentation: setup instructions, architecture overview, and contribution guidelines.",
  },
  // Dependencies
  "dep-react-dom": {
    title: "react-dom",
    body: "React DOM rendering library. Provides createRoot and hydration APIs.",
  },
  "dep-react-router": {
    title: "react-router",
    body: "Client-side routing with nested routes, loaders, and error boundaries.",
  },
  "dep-react-query": {
    title: "react-query",
    body: "Server state management with caching, background refetch, and optimistic updates.",
  },
  "dep-lucide": {
    title: "lucide-react",
    body: "Icon library with 1000+ SVG icons as React components.",
  },
  "dep-tailwind": {
    title: "tailwindcss",
    body: "Utility-first CSS framework. Configured with custom design tokens.",
  },
  "dep-clsx": {
    title: "clsx",
    body: "Tiny utility for constructing className strings conditionally.",
  },
  "dep-tw-merge": {
    title: "tailwind-merge",
    body: "Merges Tailwind CSS classes without style conflicts.",
  },
  "dep-vite": {
    title: "vite",
    body: "Build tool with HMR, ESM dev server, and Rollup-based production builds.",
  },
  "dep-typescript": {
    title: "typescript",
    body: "TypeScript compiler. Used for type checking and declaration file generation.",
  },
  "dep-esbuild": {
    title: "esbuild",
    body: "Ultra-fast JavaScript bundler used by Vite for development transforms.",
  },
  "dep-vitest": {
    title: "vitest",
    body: "Vite-native test runner with Jest-compatible API.",
  },
  "dep-rtl": {
    title: "@testing-library/react",
    body: "React component testing utilities focused on user behavior.",
  },
  "dep-playwright": {
    title: "playwright",
    body: "End-to-end testing framework for browser automation.",
  },
  "dep-eslint": {
    title: "eslint",
    body: "JavaScript/TypeScript linter with custom rule configuration.",
  },
  "dep-prettier": {
    title: "prettier",
    body: "Opinionated code formatter for consistent style.",
  },
};

// ── Target schema fixtures (for Mapping demo) ─────────────

export const targetSchemaTree: TreeNode[] = [
  {
    id: "tbl-users",
    name: "users",
    type: "branch",
    children: [
      { id: "tbl-users-id", name: "id", type: "leaf" },
      { id: "tbl-users-email", name: "email", type: "leaf" },
      { id: "tbl-users-name", name: "display_name", type: "leaf" },
      { id: "tbl-users-created", name: "created_at", type: "leaf" },
    ],
  },
  {
    id: "tbl-orders",
    name: "orders",
    type: "branch",
    children: [
      { id: "tbl-orders-id", name: "id", type: "leaf" },
      { id: "tbl-orders-user", name: "user_id", type: "leaf" },
      { id: "tbl-orders-total", name: "total", type: "leaf" },
      { id: "tbl-orders-status", name: "status", type: "leaf" },
    ],
  },
  {
    id: "tbl-products",
    name: "products",
    type: "branch",
    children: [
      { id: "tbl-products-id", name: "id", type: "leaf" },
      { id: "tbl-products-name", name: "name", type: "leaf" },
      { id: "tbl-products-price", name: "price", type: "leaf" },
    ],
  },
  {
    id: "tbl-sessions",
    name: "sessions",
    type: "branch",
    children: [
      { id: "tbl-sessions-id", name: "id", type: "leaf" },
      { id: "tbl-sessions-user", name: "user_id", type: "leaf" },
      { id: "tbl-sessions-token", name: "token", type: "leaf" },
      { id: "tbl-sessions-expires", name: "expires_at", type: "leaf" },
    ],
  },
];

// ── Dashboard fixtures ─────────────────────────────────────

export interface DashboardStat {
  label: string;
  value: string;
}

export const dashboardStats: DashboardStat[] = [
  { label: "Files", value: "124" },
  { label: "Components", value: "37" },
  { label: "Coverage", value: "89.2%" },
  { label: "Issues", value: "5" },
];

export interface ChartBar {
  label: string;
  value: number;
  color: string;
  group?: string;
}

export const dashboardBars: ChartBar[] = [
  { label: ".tsx", value: 42, color: "var(--color-cat-1)", group: "Code" },
  { label: ".ts", value: 31, color: "var(--color-cat-7)", group: "Code" },
  { label: ".jsx", value: 7, color: "var(--color-cat-9)", group: "Code" },
  { label: ".test.ts", value: 8, color: "var(--color-neutral)", group: "Code" },
  { label: ".css", value: 18, color: "var(--color-cat-3)", group: "Styles" },
  { label: ".scss", value: 6, color: "var(--color-cat-5)", group: "Styles" },
  { label: ".json", value: 14, color: "var(--color-cat-4)", group: "Config" },
  { label: ".yaml", value: 5, color: "var(--color-cat-8)", group: "Config" },
  { label: ".toml", value: 2, color: "var(--color-cat-5)", group: "Config" },
  { label: ".env", value: 3, color: "var(--color-neutral)", group: "Config" },
  { label: ".md", value: 11, color: "var(--color-cat-2)", group: "Docs" },
  { label: ".html", value: 4, color: "var(--color-cat-6)", group: "Docs" },
  { label: ".svg", value: 4, color: "var(--color-cat-10)", group: "Assets" },
  { label: ".graphql", value: 2, color: "var(--color-cat-2)", group: "Data" },
  { label: ".proto", value: 1, color: "var(--color-cat-3)", group: "Data" },
];

// ── Dashboard chart fixtures (Recharts) ─────────────────────

export interface DailyUsagePoint {
  date: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

export const dailyUsageData: DailyUsagePoint[] = [
  { date: "Feb 1",  input: 18200, output: 9100,  cacheRead: 4300,  cacheWrite: 1800, cost: 2.10 },
  { date: "Feb 2",  input: 24500, output: 12800, cacheRead: 6200,  cacheWrite: 2400, cost: 3.40 },
  { date: "Feb 3",  input: 31200, output: 15600, cacheRead: 8900,  cacheWrite: 3100, cost: 4.50 },
  { date: "Feb 4",  input: 12800, output: 6400,  cacheRead: 3100,  cacheWrite: 1200, cost: 1.60 },
  { date: "Feb 5",  input: 42100, output: 21000, cacheRead: 12400, cacheWrite: 4200, cost: 6.20 },
  { date: "Feb 6",  input: 38600, output: 19300, cacheRead: 10800, cacheWrite: 3800, cost: 5.60 },
  { date: "Feb 7",  input: 15400, output: 7700,  cacheRead: 3600,  cacheWrite: 1500, cost: 1.90 },
  { date: "Feb 8",  input: 28900, output: 14400, cacheRead: 7800,  cacheWrite: 2900, cost: 3.80 },
  { date: "Feb 9",  input: 35700, output: 17800, cacheRead: 9500,  cacheWrite: 3400, cost: 5.10 },
  { date: "Feb 10", input: 47200, output: 23600, cacheRead: 14200, cacheWrite: 4800, cost: 7.40 },
  { date: "Feb 11", input: 22100, output: 11000, cacheRead: 5400,  cacheWrite: 2100, cost: 2.80 },
  { date: "Feb 12", input: 39800, output: 19900, cacheRead: 11200, cacheWrite: 3900, cost: 5.90 },
  { date: "Feb 13", input: 33400, output: 16700, cacheRead: 8600,  cacheWrite: 3200, cost: 4.70 },
  { date: "Feb 14", input: 45600, output: 22800, cacheRead: 13800, cacheWrite: 4600, cost: 7.10 },
];

export interface ModelCostBreakdown {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export const costBreakdownData: ModelCostBreakdown[] = [
  { model: "opus",   input: 8.40, output: 12.60, cacheRead: 1.20, cacheWrite: 0.80 },
  { model: "sonnet", input: 3.20, output: 4.80,  cacheRead: 0.60, cacheWrite: 0.40 },
  { model: "haiku",  input: 0.80, output: 1.20,  cacheRead: 0.15, cacheWrite: 0.10 },
];

export interface TokenSlice {
  name: string;
  value: number;
}

export const tokenBreakdownData: TokenSlice[] = [
  { name: "Input",       value: 245000 },
  { name: "Output",      value: 128000 },
  { name: "Cache Read",  value: 89000 },
  { name: "Cache Write", value: 34000 },
];

// ── Master-Detail fixtures ─────────────────────────────────

export interface ClassRecord {
  name: string;
  package: string;
  status: "success" | "warning" | "error" | "neutral";
  methods: number;
  fields: number;
  description: string;
  code: string;
}

export const classRecords: ClassRecord[] = [
  {
    name: "UserService",
    package: "core",
    status: "success",
    methods: 12,
    fields: 8,
    description:
      "Handles user creation, lookup, and profile updates. Depends on AuthProvider and CacheManager.",
    code: `export class UserService {
  private cache: CacheManager;
  private auth: AuthProvider;

  async findById(id: string): Promise<User> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    return this.repo.findOne(id);
  }
}`,
  },
  {
    name: "OrderController",
    package: "api",
    status: "success",
    methods: 8,
    fields: 4,
    description:
      "REST controller for order CRUD operations. Validates input via OrderSchema.",
    code: `export class OrderController {
  @Post("/orders")
  async create(@Body() dto: CreateOrderDto) {
    return this.service.create(dto);
  }

  @Get("/orders/:id")
  async findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }
}`,
  },
  {
    name: "CacheManager",
    package: "infra",
    status: "warning",
    methods: 6,
    fields: 3,
    description:
      "In-memory LRU cache with configurable TTL. Warning: no persistence across restarts.",
    code: `export class CacheManager {
  private store = new Map<string, CacheEntry>();
  private maxSize = 1000;

  get(key: string): unknown | undefined {
    const entry = this.store.get(key);
    if (!entry || entry.expiry < Date.now()) return undefined;
    return entry.value;
  }
}`,
  },
  {
    name: "AuthHandler",
    package: "core",
    status: "success",
    methods: 5,
    fields: 2,
    description:
      "Middleware that validates JWT tokens and attaches the user context to the request.",
    code: `export class AuthHandler {
  async verify(token: string): Promise<UserContext> {
    const payload = jwt.verify(token, this.secret);
    return { userId: payload.sub, role: payload.role };
  }
}`,
  },
  {
    name: "LogUtil",
    package: "util",
    status: "neutral",
    methods: 4,
    fields: 1,
    description:
      "Structured logging utility. Wraps console with JSON formatting and log levels.",
    code: `export class LogUtil {
  private level: LogLevel;

  info(msg: string, ctx?: Record<string, unknown>) {
    if (this.level <= LogLevel.INFO) {
      console.log(JSON.stringify({ level: "info", msg, ...ctx }));
    }
  }
}`,
  },
  {
    name: "EventBus",
    package: "core",
    status: "error",
    methods: 7,
    fields: 5,
    description:
      "Publish/subscribe event system. Error: memory leak detected in subscriber cleanup.",
    code: `export class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
  }
}`,
  },
];

// ── Nested Master-Detail fixtures ──────────────────────────

export interface TeamMember {
  name: string;
  role: string;
  status: "success" | "warning" | "error" | "neutral";
  commits: number;
  reviews: number;
}

export interface Team {
  name: string;
  lead: string;
  members: TeamMember[];
  totalCommits: number;
  openPRs: number;
}

export interface Department {
  name: string;
  headcount: number;
  teams: Team[];
  totalCommits: number;
  budget: string;
}

export const departments: Department[] = [
  {
    name: "Platform",
    headcount: 11,
    totalCommits: 1842,
    budget: "$2.4M",
    teams: [
      {
        name: "Core API",
        lead: "Alice Chen",
        totalCommits: 724,
        openPRs: 5,
        members: [
          { name: "Alice Chen", role: "Tech Lead", status: "success", commits: 218, reviews: 64 },
          { name: "Bob Park", role: "Senior Engineer", status: "success", commits: 195, reviews: 52 },
          { name: "Carla Ruiz", role: "Engineer", status: "warning", commits: 142, reviews: 31 },
          { name: "Dan Okafor", role: "Junior Engineer", status: "success", commits: 169, reviews: 28 },
        ],
      },
      {
        name: "Infrastructure",
        lead: "Eli Vance",
        totalCommits: 583,
        openPRs: 3,
        members: [
          { name: "Eli Vance", role: "Tech Lead", status: "success", commits: 201, reviews: 47 },
          { name: "Fay Tanaka", role: "SRE", status: "success", commits: 178, reviews: 39 },
          { name: "George Kim", role: "DevOps Engineer", status: "error", commits: 204, reviews: 22 },
        ],
      },
      {
        name: "Data Pipeline",
        lead: "Hana Johal",
        totalCommits: 535,
        openPRs: 7,
        members: [
          { name: "Hana Johal", role: "Tech Lead", status: "success", commits: 187, reviews: 55 },
          { name: "Ivan Petrov", role: "Data Engineer", status: "warning", commits: 162, reviews: 34 },
          { name: "Jess Wu", role: "Data Engineer", status: "success", commits: 186, reviews: 41 },
        ],
      },
    ],
  },
  {
    name: "Product",
    headcount: 9,
    totalCommits: 1356,
    budget: "$1.8M",
    teams: [
      {
        name: "Frontend",
        lead: "Kai Nakamura",
        totalCommits: 812,
        openPRs: 8,
        members: [
          { name: "Kai Nakamura", role: "Tech Lead", status: "success", commits: 245, reviews: 71 },
          { name: "Lena Schulz", role: "Senior Engineer", status: "success", commits: 198, reviews: 58 },
          { name: "Marco Silva", role: "Engineer", status: "success", commits: 201, reviews: 42 },
          { name: "Nina Patel", role: "Engineer", status: "warning", commits: 168, reviews: 36 },
        ],
      },
      {
        name: "Design Systems",
        lead: "Oscar Lam",
        totalCommits: 544,
        openPRs: 4,
        members: [
          { name: "Oscar Lam", role: "Tech Lead", status: "success", commits: 192, reviews: 63 },
          { name: "Priya Desai", role: "UI Engineer", status: "success", commits: 176, reviews: 48 },
          { name: "Quinn Torres", role: "UI Engineer", status: "neutral", commits: 176, reviews: 35 },
        ],
      },
    ],
  },
  {
    name: "Security",
    headcount: 7,
    totalCommits: 948,
    budget: "$1.2M",
    teams: [
      {
        name: "AppSec",
        lead: "Rita Novak",
        totalCommits: 512,
        openPRs: 2,
        members: [
          { name: "Rita Novak", role: "Tech Lead", status: "success", commits: 186, reviews: 72 },
          { name: "Sam Abadi", role: "Security Engineer", status: "success", commits: 164, reviews: 54 },
          { name: "Tina Cheng", role: "Security Engineer", status: "error", commits: 162, reviews: 41 },
        ],
      },
      {
        name: "Identity",
        lead: "Uma Reddy",
        totalCommits: 436,
        openPRs: 3,
        members: [
          { name: "Uma Reddy", role: "Tech Lead", status: "success", commits: 158, reviews: 61 },
          { name: "Victor Diaz", role: "Engineer", status: "success", commits: 148, reviews: 39 },
          { name: "Wendy Zhao", role: "Engineer", status: "warning", commits: 130, reviews: 28 },
        ],
      },
    ],
  },
];

// ── Form + Results fixtures ────────────────────────────────

export const languageOptions = [
  { value: "all", label: "All Languages" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

export const scopeOptions = [
  { value: "all", label: "All Files" },
  { value: "src", label: "src/" },
  { value: "lib", label: "lib/" },
  { value: "tests", label: "tests/" },
];

export interface SearchResult {
  file: string;
  line: number;
  relevance: "success" | "warning" | "neutral";
  relevanceLabel: string;
  language: string;
  code: string;
}

export const searchResults: SearchResult[] = [
  {
    file: "src/auth/login.ts",
    line: 42,
    relevance: "success",
    relevanceLabel: "High",
    language: "typescript",
    code: `export async function authenticate(
  email: string,
  password: string
): Promise<AuthResult> {
  const user = await findUserByEmail(email);
  if (!user) throw new UnauthorizedError();
  const valid = await bcrypt.compare(password, user.hash);
  return { token: issueToken(user), user };
}`,
  },
  {
    file: "src/utils/hash.ts",
    line: 17,
    relevance: "success",
    relevanceLabel: "High",
    language: "typescript",
    code: `export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}`,
  },
  {
    file: "src/middleware/session.ts",
    line: 8,
    relevance: "warning",
    relevanceLabel: "Medium",
    language: "typescript",
    code: `export function sessionMiddleware(req: Request, res: Response, next: Next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  req.user = verifyToken(token);
  next();
}`,
  },
  {
    file: "tests/auth.test.ts",
    line: 23,
    relevance: "neutral",
    relevanceLabel: "Low",
    language: "typescript",
    code: `const TEST_ACCOUNT = fixtures.account("standard");

describe("authenticate", () => {
  it("returns a token for valid credentials", async () => {
    const result = await authenticate(TEST_ACCOUNT.login, "pass123");
    expect(result.token).toBeDefined();
    expect(result.user.login).toBe(TEST_ACCOUNT.login);
  });
});`,
  },
];

// ── Package records for Data Table pattern ──────────────────

export interface PackageRecord {
  name: string;
  version: string;
  license: string;
  sizeKb: number;
  downloads: number;
  description: string;
  author: string;
  status: "success" | "warning" | "error" | "neutral";
}

export const packageRecords: PackageRecord[] = [
  { name: "react", version: "18.3.1", license: "MIT", sizeKb: 312, downloads: 24500000, description: "A JavaScript library for building user interfaces", author: "Meta", status: "success" },
  { name: "react-dom", version: "18.3.1", license: "MIT", sizeKb: 4200, downloads: 23100000, description: "React package for working with the DOM", author: "Meta", status: "success" },
  { name: "typescript", version: "5.5.4", license: "Apache-2.0", sizeKb: 22400, downloads: 18700000, description: "TypeScript is a language for application scale JavaScript development", author: "Microsoft", status: "success" },
  { name: "vite", version: "5.4.2", license: "MIT", sizeKb: 1580, downloads: 9800000, description: "Next generation frontend tooling", author: "Evan You", status: "success" },
  { name: "tailwindcss", version: "3.4.10", license: "MIT", sizeKb: 5400, downloads: 11200000, description: "A utility-first CSS framework for rapid UI development", author: "Tailwind Labs", status: "success" },
  { name: "eslint", version: "9.9.0", license: "MIT", sizeKb: 3100, downloads: 14300000, description: "An AST-based pattern checker for JavaScript", author: "Nicholas C. Zakas", status: "success" },
  { name: "prettier", version: "3.3.3", license: "MIT", sizeKb: 7800, downloads: 12600000, description: "Opinionated code formatter", author: "James Long", status: "success" },
  { name: "vitest", version: "2.0.5", license: "MIT", sizeKb: 2900, downloads: 5400000, description: "Next generation testing framework powered by Vite", author: "Anthony Fu", status: "success" },
  { name: "zod", version: "3.23.8", license: "MIT", sizeKb: 420, downloads: 7900000, description: "TypeScript-first schema validation with static type inference", author: "Colin McDonnell", status: "success" },
  { name: "axios", version: "1.7.4", license: "MIT", sizeKb: 890, downloads: 16200000, description: "Promise based HTTP client for the browser and node.js", author: "Matt Zabriskie", status: "warning" },
  { name: "lodash", version: "4.17.21", license: "MIT", sizeKb: 1410, downloads: 19800000, description: "A modern JavaScript utility library delivering modularity and performance", author: "John-David Dalton", status: "warning" },
  { name: "date-fns", version: "3.6.0", license: "MIT", sizeKb: 2300, downloads: 6100000, description: "Modern JavaScript date utility library", author: "Sasha Koss", status: "success" },
  { name: "lucide-react", version: "0.428.0", license: "ISC", sizeKb: 680, downloads: 3200000, description: "Beautiful & consistent icon toolkit for React", author: "Lucide Contributors", status: "success" },
  { name: "clsx", version: "2.1.1", license: "MIT", sizeKb: 8, downloads: 12800000, description: "A tiny utility for constructing className strings conditionally", author: "Luke Edwards", status: "success" },
  { name: "zustand", version: "4.5.5", license: "MIT", sizeKb: 48, downloads: 4800000, description: "Bear necessities for state management in React", author: "Daishi Kato", status: "success" },
  { name: "react-query", version: "5.52.1", license: "MIT", sizeKb: 620, downloads: 5600000, description: "Hooks for fetching, caching, and updating asynchronous data in React", author: "Tanner Linsley", status: "success" },
  { name: "express", version: "4.19.2", license: "MIT", sizeKb: 572, downloads: 15900000, description: "Fast, unopinionated, minimalist web framework", author: "TJ Holowaychuk", status: "warning" },
  { name: "next", version: "14.2.5", license: "MIT", sizeKb: 18200, downloads: 8300000, description: "The React framework for production", author: "Vercel", status: "success" },
  { name: "prisma", version: "5.18.0", license: "Apache-2.0", sizeKb: 14500, downloads: 3100000, description: "Next-generation ORM for Node.js and TypeScript", author: "Prisma", status: "success" },
  { name: "drizzle-orm", version: "0.33.0", license: "Apache-2.0", sizeKb: 890, downloads: 1200000, description: "TypeScript ORM that is lightweight and performant", author: "Drizzle Team", status: "success" },
  { name: "playwright", version: "1.46.1", license: "Apache-2.0", sizeKb: 4100, downloads: 2900000, description: "A framework for Web Testing and Automation", author: "Microsoft", status: "success" },
  { name: "storybook", version: "8.2.9", license: "MIT", sizeKb: 9200, downloads: 2400000, description: "The UI component explorer for frontend developers", author: "Storybook", status: "warning" },
  { name: "d3", version: "7.9.0", license: "ISC", sizeKb: 3800, downloads: 4100000, description: "Data-Driven Documents for visualization", author: "Mike Bostock", status: "success" },
  { name: "three", version: "0.167.1", license: "MIT", sizeKb: 6700, downloads: 1800000, description: "JavaScript 3D library for WebGL rendering", author: "Mr.doob", status: "neutral" },
  { name: "framer-motion", version: "11.3.24", license: "MIT", sizeKb: 4200, downloads: 3900000, description: "Production-ready motion library for React", author: "Framer", status: "success" },
  { name: "socket.io", version: "4.7.5", license: "MIT", sizeKb: 1200, downloads: 3500000, description: "Realtime application framework with WebSocket support", author: "Guillermo Rauch", status: "success" },
  { name: "graphql", version: "16.9.0", license: "MIT", sizeKb: 780, downloads: 5200000, description: "A query language for APIs and runtime for executing queries", author: "GraphQL Foundation", status: "success" },
  { name: "trpc", version: "10.45.2", license: "MIT", sizeKb: 340, downloads: 1100000, description: "End-to-end typesafe APIs made easy", author: "KATT", status: "success" },
  { name: "pino", version: "9.3.2", license: "MIT", sizeKb: 290, downloads: 2800000, description: "Super fast, all natural JSON logger", author: "Matteo Collina", status: "success" },
  { name: "esbuild", version: "0.23.0", license: "MIT", sizeKb: 9100, downloads: 8100000, description: "An extremely fast bundler for the web", author: "Evan Wallace", status: "success" },
  { name: "rollup", version: "4.21.0", license: "MIT", sizeKb: 2700, downloads: 7600000, description: "Next-generation ES module bundler", author: "Rich Harris", status: "success" },
  { name: "webpack", version: "5.93.0", license: "MIT", sizeKb: 5400, downloads: 13200000, description: "A bundler for JavaScript and friends", author: "Tobias Koppers", status: "warning" },
  { name: "turbo", version: "2.0.14", license: "MPL-2.0", sizeKb: 11200, downloads: 1500000, description: "Incremental bundler and build system for monorepos", author: "Vercel", status: "success" },
  { name: "sass", version: "1.77.8", license: "MIT", sizeKb: 5100, downloads: 6400000, description: "A pure JavaScript implementation of Sass", author: "Natalie Weizenbaum", status: "success" },
  { name: "postcss", version: "8.4.41", license: "MIT", sizeKb: 180, downloads: 14800000, description: "A tool for transforming CSS with JavaScript", author: "Andrey Sitnik", status: "success" },
  { name: "sharp", version: "0.33.4", license: "Apache-2.0", sizeKb: 42000, downloads: 3700000, description: "High performance Node.js image processing", author: "Lovell Fuller", status: "success" },
  { name: "bcrypt", version: "5.1.1", license: "MIT", sizeKb: 320, downloads: 2100000, description: "A library to help hash passwords", author: "Nick Campbell", status: "neutral" },
  { name: "jsonwebtoken", version: "9.0.2", license: "MIT", sizeKb: 110, downloads: 7200000, description: "JSON Web Token implementation for node.js", author: "Auth0", status: "success" },
  { name: "helmet", version: "7.1.0", license: "MIT", sizeKb: 52, downloads: 3400000, description: "Help secure Express apps with various HTTP headers", author: "Evan Hahn", status: "success" },
  { name: "cors", version: "2.8.5", license: "MIT", sizeKb: 18, downloads: 8900000, description: "Node.js CORS middleware for Express", author: "Troy Goode", status: "warning" },
  { name: "dotenv", version: "16.4.5", license: "BSD-2-Clause", sizeKb: 34, downloads: 14100000, description: "Loads environment variables from a .env file", author: "Scott Motte", status: "success" },
  { name: "nanoid", version: "5.0.7", license: "MIT", sizeKb: 6, downloads: 9700000, description: "A tiny, secure, URL-friendly unique string ID generator", author: "Andrey Sitnik", status: "success" },
  { name: "chalk", version: "5.3.0", license: "MIT", sizeKb: 42, downloads: 18500000, description: "Terminal string styling done right", author: "Sindre Sorhus", status: "success" },
  { name: "commander", version: "12.1.0", license: "MIT", sizeKb: 98, downloads: 15100000, description: "The complete solution for Node.js command-line programs", author: "TJ Holowaychuk", status: "success" },
  { name: "inquirer", version: "10.1.6", license: "MIT", sizeKb: 210, downloads: 6800000, description: "A collection of common interactive command line user interfaces", author: "Simon Boudrias", status: "success" },
  { name: "debug", version: "4.3.6", license: "MIT", sizeKb: 24, downloads: 22000000, description: "A tiny JavaScript debugging utility", author: "TJ Holowaychuk", status: "success" },
  { name: "winston", version: "3.14.1", license: "MIT", sizeKb: 410, downloads: 4500000, description: "A logger for just about everything", author: "Charlie Robbins", status: "neutral" },
  { name: "redis", version: "4.7.0", license: "MIT", sizeKb: 560, downloads: 2600000, description: "A high-performance Node.js Redis client", author: "Redis Ltd", status: "success" },
  { name: "pg", version: "8.12.0", license: "MIT", sizeKb: 340, downloads: 3800000, description: "Non-blocking PostgreSQL client for Node.js", author: "Brian Carlson", status: "success" },
  { name: "mongoose", version: "8.5.3", license: "MIT", sizeKb: 2800, downloads: 3200000, description: "MongoDB object modeling tool for Node.js", author: "Automattic", status: "error" },
];

// ── Markdown Viewer fixtures ────────────────────────────────

export interface MarkdownDocument {
  title: string;
  content: string;
}

export const markdownDocTree: TreeNode[] = [
  {
    id: "md-docs",
    name: "docs",
    type: "branch",
    children: [
      { id: "md-readme", name: "README.md", type: "leaf" },
      { id: "md-architecture", name: "ARCHITECTURE.md", type: "leaf" },
      { id: "md-api", name: "API_REFERENCE.md", type: "leaf" },
    ],
  },
  {
    id: "md-guides",
    name: "guides",
    type: "branch",
    children: [
      { id: "md-getting-started", name: "getting-started.md", type: "leaf" },
      { id: "md-deployment", name: "deployment.md", type: "leaf" },
    ],
  },
];

export const markdownDocuments: Record<string, MarkdownDocument> = {
  "md-readme": {
    title: "README.md",
    content: `# Project Name

A modern web application built with React and TypeScript.

## Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/example/project.git
cd project

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

> [!NOTE]
> Requires Node.js 18 or later. See the [getting started guide](#getting-started) for full setup instructions.

## Features

- **Type-safe**: Full TypeScript support with strict mode
- **Fast builds**: Powered by Vite with HMR
- **Tested**: Comprehensive unit and integration tests
- **Documented**: API reference and architecture guide

## Architecture

The project follows a layered architecture:

\`\`\`mermaid
flowchart TD
  A[Presentation Layer] --> B[Service Layer]
  B --> C[Data Access Layer]
  C --> D[(Database)]
  B --> E[External APIs]
\`\`\`

## Project Structure

| Directory | Purpose |
|-----------|---------|
| \`src/components\` | UI components |
| \`src/services\` | Business logic |
| \`src/hooks\` | Custom React hooks |
| \`src/utils\` | Utility functions |
| \`tests/\` | Test suites |

## Task List

- [x] Initial project setup
- [x] Authentication system
- [ ] User dashboard
- [ ] Admin panel
- [ ] API documentation

## Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/my-feature\`
3. Commit changes: \`git commit -m "Add my feature"\`
4. Push and create a pull request

> [!TIP]
> Run \`npm run lint\` before committing to catch style issues early.

---

## License

MIT License. See [LICENSE](./LICENSE) for details.
`,
  },

  "md-architecture": {
    title: "ARCHITECTURE.md",
    content: `# Architecture

## Overview

The system uses a three-tier architecture with clear separation of concerns between the presentation, business logic, and data layers.

## System Diagram

\`\`\`mermaid
sequenceDiagram
  participant C as Client
  participant A as API Gateway
  participant S as Service Layer
  participant D as Database

  C->>A: HTTP Request
  A->>A: Validate Token
  A->>S: Forward Request
  S->>D: Query Data
  D-->>S: Result Set
  S-->>A: Response DTO
  A-->>C: JSON Response
\`\`\`

## Layers

### Presentation Layer

The frontend is built with React 18 and uses functional components with hooks. State management is handled through a combination of React Context for global state and local \`useState\` for component-specific state.

\`\`\`typescript
// Example: Feature component structure
export function UserDashboard() {
  const { user } = useCurrentUser();
  const { data, isLoading } = useQuery("dashboard", fetchDashboard);

  if (isLoading) return <Skeleton />;

  return (
    <DashboardLayout>
      <StatsPanel stats={data.stats} />
      <ActivityFeed items={data.activity} />
    </DashboardLayout>
  );
}
\`\`\`

### Service Layer

Business logic is encapsulated in service classes that handle validation, transformation, and orchestration.

> [!IMPORTANT]
> Services should never access the database directly. Always go through the data access layer for database operations.

### Data Access Layer

Uses the repository pattern with TypeScript generics for type-safe database access:

\`\`\`typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, "id">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
\`\`\`

## Error Handling

Errors flow through a centralized handler:

| Error Type | HTTP Status | User Action |
|-----------|-------------|-------------|
| ValidationError | 400 | Fix input |
| AuthenticationError | 401 | Re-login |
| AuthorizationError | 403 | Contact admin |
| NotFoundError | 404 | Check URL |
| InternalError | 500 | Retry later |

> [!WARNING]
> Never expose internal error details (stack traces, query parameters) in production API responses. Use the error codes table above for user-facing messages.

## Deployment

\`\`\`mermaid
flowchart LR
  A[Git Push] --> B[CI Pipeline]
  B --> C{Tests Pass?}
  C -->|Yes| D[Build Image]
  C -->|No| E[Notify Dev]
  D --> F[Push to Registry]
  F --> G[Deploy to Staging]
  G --> H{Smoke Tests?}
  H -->|Yes| I[Deploy to Prod]
  H -->|No| E
\`\`\`

## Security

> [!CAUTION]
> All API keys and secrets must be stored in environment variables, never committed to the repository. Use \`.env.local\` for development and the secrets manager in production.
`,
  },

  "md-api": {
    title: "API_REFERENCE.md",
    content: `# API Reference

## Base URL

\`\`\`
https://api.example.com/v1
\`\`\`

## Authentication

All endpoints require a Bearer token in the \`Authorization\` header:

\`\`\`bash
curl -H "Authorization: Bearer <token>" https://api.example.com/v1/users
\`\`\`

## Endpoints

### Users

#### List Users

\`\`\`
GET /users
\`\`\`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`page\` | integer | 1 | Page number |
| \`limit\` | integer | 20 | Items per page |
| \`sort\` | string | \`created_at\` | Sort field |
| \`order\` | string | \`desc\` | Sort direction |

**Response:**

\`\`\`json
{
  "data": [
    {
      "id": "usr_123",
      "email": "alice@example.com",
      "name": "Alice",
      "role": "admin",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
\`\`\`

#### Create User

\`\`\`
POST /users
\`\`\`

**Request Body:**

\`\`\`json
{
  "email": "bob@example.com",
  "name": "Bob",
  "role": "member"
}
\`\`\`

> [!NOTE]
> The \`role\` field defaults to \`member\` if not specified. Only admins can create users with the \`admin\` role.

### Orders

#### Get Order

\`\`\`
GET /orders/:id
\`\`\`

#### Update Order Status

\`\`\`
PATCH /orders/:id/status
\`\`\`

\`\`\`json
{
  "status": "shipped",
  "tracking_number": "1Z999AA10123456784"
}
\`\`\`

## Error Responses

All errors follow the standard format:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
\`\`\`

## Rate Limiting

> [!WARNING]
> API requests are limited to **100 requests per minute** per API key. Exceeding this limit returns a \`429 Too Many Requests\` response with a \`Retry-After\` header.

---

## SDK Installation

\`\`\`bash
npm install @example/sdk
\`\`\`

\`\`\`typescript
import { Client } from "@example/sdk";

const client = new Client({
  apiKey: process.env.API_KEY,
  baseUrl: "https://api.example.com/v1",
});

const users = await client.users.list({ limit: 10 });
\`\`\`
`,
  },

  "md-getting-started": {
    title: "getting-started.md",
    content: `# Getting Started

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org) 18 or later
- [Git](https://git-scm.com)
- A code editor (we recommend [VS Code](https://code.visualstudio.com))

## Installation

### Step 1: Clone the Repository

\`\`\`bash
git clone https://github.com/example/project.git
cd project
\`\`\`

### Step 2: Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Step 3: Configure Environment

\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` and fill in the required values:

\`\`\`bash
DATABASE_URL=postgresql://localhost:5432/myapp
API_KEY=your-api-key-here
JWT_SECRET=your-secret-here
\`\`\`

> [!CAUTION]
> Never commit your \`.env\` file to version control. It contains sensitive credentials.

### Step 4: Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

The application will be available at \`http://localhost:3000\`.

## Project Structure

\`\`\`
project/
├── src/
│   ├── components/    # React components
│   ├── services/      # Business logic
│   ├── hooks/         # Custom hooks
│   └── utils/         # Utility functions
├── tests/             # Test suites
├── public/            # Static assets
└── package.json
\`\`\`

## Common Tasks

| Task | Command |
|------|---------|
| Start dev server | \`npm run dev\` |
| Run tests | \`npm test\` |
| Build for production | \`npm run build\` |
| Lint code | \`npm run lint\` |
| Type check | \`npm run typecheck\` |

## Next Steps

1. Read the [Architecture Guide](./ARCHITECTURE.md) to understand the codebase
2. Browse the [API Reference](./API_REFERENCE.md) for endpoint details
3. Check the [Deployment Guide](./deployment.md) when you're ready to ship

> [!TIP]
> Use \`npm run dev -- --open\` to automatically open the browser when starting the dev server.
`,
  },

  "md-deployment": {
    title: "deployment.md",
    content: `# Deployment Guide

## Overview

The application is deployed as a Docker container to a Kubernetes cluster. The CI/CD pipeline handles building, testing, and deploying automatically.

## Deployment Flow

\`\`\`mermaid
flowchart TD
  A[Developer pushes code] --> B[GitHub Actions triggered]
  B --> C[Run tests & lint]
  C --> D{All checks pass?}
  D -->|No| E[Block merge]
  D -->|Yes| F[Build Docker image]
  F --> G[Push to container registry]
  G --> H[Deploy to staging]
  H --> I[Run smoke tests]
  I --> J{Smoke tests pass?}
  J -->|Yes| K[Promote to production]
  J -->|No| L[Rollback & alert team]
\`\`\`

## Docker Setup

### Building the Image

\`\`\`bash
# Build the production image
docker build -t myapp:latest .

# Run locally for testing
docker run -p 3000:3000 --env-file .env myapp:latest
\`\`\`

### Dockerfile

\`\`\`bash
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
\`\`\`

## Environment Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| \`NODE_ENV\` | Yes | \`development\` | Runtime environment |
| \`PORT\` | No | \`3000\` | Server port |
| \`DATABASE_URL\` | Yes | — | PostgreSQL connection string |
| \`REDIS_URL\` | No | — | Redis cache URL |
| \`LOG_LEVEL\` | No | \`info\` | Logging verbosity |

> [!IMPORTANT]
> Always set \`NODE_ENV=production\` in deployed environments. This enables performance optimizations and disables development-only features.

## Health Checks

The application exposes health check endpoints:

- \`GET /health\` — Basic liveness check
- \`GET /health/ready\` — Readiness check (includes database connectivity)

## Rollback Procedure

If a deployment causes issues:

1. Identify the last known good image tag
2. Run \`kubectl rollout undo deployment/myapp\`
3. Monitor logs: \`kubectl logs -f deployment/myapp\`
4. Verify health checks are passing

> [!WARNING]
> Database migrations cannot be automatically rolled back. If the deployment includes migration changes, coordinate with the DBA before rolling back.
`,
  },
};

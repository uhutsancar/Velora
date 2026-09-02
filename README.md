# Velora

Premium e-commerce platform built on the existing **SellingBuddy** .NET 8 microservice
architecture: a customer storefront, a separate back office, and the services behind them.

Everything below runs against real services — there is no mock layer anywhere in the stack.

```
┌────────────────────┐        ┌────────────────────┐
│  Velora Storefront │        │    Velora Admin    │
│  React · :5173     │        │  React+MUI · :5174 │
└─────────┬──────────┘        └─────────┬──────────┘
          │                             │
          └──────────────┬──────────────┘
                         ▼
              ┌──────────────────────┐      ┌──────────┐
              │ Ocelot API Gateway   │◄────►│  Consul  │
              │       :5000          │ disc.│  :8500   │
              └──────────┬───────────┘      └────▲─────┘
      ┌──────────────────┼──────────────────┐    │ register
      ▼                  ▼                  ▼    │
┌───────────┐     ┌────────────┐     ┌───────────┴┐
│ Identity  │     │  Catalog   │     │   Basket   │
│  :5005    │     │   :5004    │     │   :5003    │
│ SQL       │     │ SQL        │     │ Redis      │
└───────────┘     └─────┬──────┘     └─────┬──────┘
                        │ stock            │ checkout
                        ▼                  ▼
        ┌───────────────────────────────────────────────┐
        │  RabbitMQ — exchange "SellingBuddyEventBus"   │
        │  + dead-letter exchange for failed handlers   │
        └───┬─────────────────┬────────────────┬────────┘
            ▼                 ▼                ▼
      ┌───────────┐     ┌───────────┐   ┌──────────────┐
      │   Order   │     │  Payment  │   │ Notification │
      │   :5002   │     │   :5001   │   │  console app │
      │ SQL·DDD   │     │           │   │              │
      └───────────┘     └───────────┘   └──────────────┘
```

---

## 1. Quick start

**Requirements:** .NET 8 SDK, Node 20+, pnpm 9+, Docker Desktop, Python 3 (for the
verification scripts only).

Everything below runs against `Development`, where the services fall back to local
throwaway credentials. Nothing has to be configured for a fresh clone to work.

### 1.1 Backend, command by command

```powershell
# --- 1. Infrastructure: Consul, RabbitMQ, Redis, SQL Server -------------------
docker compose -f docker-compose.infrastructure.yml up -d

# wait until all four report healthy
docker compose -f docker-compose.infrastructure.yml ps

# --- 2. Build once ------------------------------------------------------------
dotnet restore SellingBuddy.sln
dotnet build SellingBuddy.sln

# --- 3. Services, one per window, in this order --------------------------------
# The gateway resolves the others through Consul, so it starts last.
dotnet run --project SellingBuddy/src/Services/IdentityService/IdentityService.Api
dotnet run --project SellingBuddy/src/Services/CatalogService/CatalogService.Api
dotnet run --project SellingBuddy/src/Services/BasketService/BasketService.Api
dotnet run --project SellingBuddy/src/Services/OrderService/OrderService.Api
dotnet run --project SellingBuddy/src/Services/PaymentService/PaymentService.Api
dotnet run --project SellingBuddy/src/Services/NotificationService/NotificationService
dotnet run --project SellingBuddy/src/ApiGateways/WebApiGateway/Web.ApiGateway
```

Or all of it in one step, each service in its own window:

```powershell
./scripts/start-infrastructure.ps1
./scripts/run-backend.ps1 -SkipInfrastructure
```

### 1.2 Frontend, command by command

```powershell
cd velora
pnpm install

# both apps at once: storefront :5173, admin :5174
pnpm dev

# or separately, one per window
pnpm dev:store
pnpm dev:admin
```

Production bundles and the other front-end checks:

```powershell
cd velora
pnpm build          # shared package, then both apps
pnpm lint
pnpm typecheck
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright, needs the backend running
```

### 1.3 Where everything lives

| Surface | URL | Sign in |
|---|---|---|
| Storefront | http://localhost:5173 | register a new account |
| Admin | http://localhost:5174 | `admin@velora.com` / `.env: SEED_ADMIN_PASSWORD` |
| API Gateway | http://localhost:5000 | — |
| Swagger (per service) | http://localhost:5005/swagger, `:5004`, `:5003`, `:5002` | — |
| Consul UI | http://localhost:8500 | — |
| RabbitMQ UI | http://localhost:15672 | guest / guest |

> The seeded admin exists **only in Development**. Outside it, `SeedAdmin:Password`
> has no default: leave it unset and no admin account is created at all.

### 1.4 Verify the whole chain

```powershell
# 60 assertions: HTTP surface, end to end through the gateway
python scripts/verify-stack.py

# 32 assertions: the asynchronous half, message by message
python scripts/verify-eventbus.py
```

`verify-stack.py` walks catalogue → register → basket → coupon → checkout → order saga →
authorization → admin CRUD → storefront reflection.

`verify-eventbus.py` asserts the topology (12 subscriber queues, their bindings and a live
consumer on each), publishes one real checkout, then proves every hop of the saga consumed
its message in order, that each handler's side effect actually happened, and that no message
landed in a dead-letter queue. See section 5.3.

Both accept `VELORA_GATEWAY=http://127.0.0.1:5010` if the gateway runs elsewhere.

Broker transport tests, RabbitMQ and Azure Service Bus, including a publish → receive
round trip:

```powershell
dotnet test SellingBuddy/tests/BuildingBlocks/EventBus.UnitTest

# the Azure tests skip unless a namespace is configured
$env:EventBus__ConnectionString = '<azure service bus connection string>'
dotnet test SellingBuddy/tests/BuildingBlocks/EventBus.UnitTest
```

---

## 2. Repository layout

```
microservice_project/
├── SellingBuddy/                       # backend solution (.NET 8)
│   └── src/
│       ├── ApiGateways/WebApiGateway/  # Ocelot + Consul
│       ├── BuildingBlocks/
│       │   ├── Common/Velora.Shared/   # NEW: shared contracts, auth, discovery, errors
│       │   └── EventBus/               # RabbitMQ / Azure Service Bus abstraction
│       └── Services/
│           ├── IdentityService/        # users, roles, permissions, refresh tokens, addresses
│           ├── CatalogService/         # products, categories, brands, variants, reviews,
│           │                           # coupons, campaigns, media, inventory
│           ├── BasketService/          # Redis cart + wishlist + checkout
│           ├── OrderService/           # DDD + CQRS orders, status saga, analytics
│           ├── PaymentService/         # payment step of the saga
│           └── NotificationService/    # console notifier
│
├── velora/                             # pnpm workspace (frontend)
│   ├── packages/shared/                # API client, types, zod schemas, i18n, utils
│   └── apps/
│       ├── storefront/                 # customer site
│       └── admin/                      # back office
│
├── scripts/                            # start / reset / verify
│   ├── start-infrastructure.ps1
│   ├── run-backend.ps1
│   ├── reset-databases.ps1
│   ├── verify-stack.py                 # 60 assertions, HTTP surface
│   └── verify-eventbus.py              # 32 assertions, message flow
│
├── docker-compose.infrastructure.yml   # LOCAL: infrastructure only
├── docker-compose.prod.yml             # PRODUCTION: the whole stack
├── .env.example                        # production environment template
├── .dockerignore
└── PROJECT_STRUCTURE.md                # analysis of the pre-Velora baseline
```

Each service and both frontends carry their own `Dockerfile` next to the project, built from
the repository root as context.

---

## 3. What changed, and why

### 3.1 Critical defects fixed in the existing services

| # | Defect | Effect before the fix |
|---|---|---|
| 1 | `BaseEventBus.ProcessEvent` resolved handlers from the **root** provider | every handler with a scoped dependency (DbContext, MediatR) threw — event processing was entirely broken |
| 2 | `GenericRepository.UnitOfWork` was never assigned | `NullReferenceException` on every order creation |
| 3 | `Buyer` / `PaymentMethod` never assigned their `Guid` key | the *second* order in the system failed on a duplicate primary key |
| 4 | `OrderStarted` contract mismatch (`userName` sent, `orderId` expected) | payment always ran against `OrderId = 0` |
| 5 | No payment-result handler in OrderService | orders stayed `Submitted` forever; the saga never closed |
| 6 | Shadow FKs typed `int` against `Guid` primary keys | broken relationships in the ordering model |
| 7 | `RabbitMQPersistentConnection` never stored `retryCount` | `WaitAndRetry(0)` — retries silently disabled |
| 8 | Failed messages were `BasicAck`-ed | every handler failure lost the message permanently |
| 9 | Catalog connection string key did not exist | CatalogService could not start |
| 10 | `IdentityService` never verified the password | anyone could obtain a token for any username |

### 3.2 New shared building block

`BuildingBlocks/Common/Velora.Shared` removes four-way duplication and makes cross-service
behaviour consistent:

- `Security/` — role and permission constants, one JWT validation setup, policy registration,
  `ClaimsPrincipal` helpers. A token issued by Identity is now validated identically everywhere.
- `Discovery/` — one Consul registration with health checks. The health-check host is
  configurable (`ConsulConfig:HealthCheckHost`), which matters because Consul runs in Docker
  and `localhost` there means the container, not your machine.
- `Middleware/` — `ApiExceptionMiddleware` gives every service the same JSON error body.
- `Contracts/` — the single `PagedResult<T>` envelope every list endpoint returns.
- `Text/Slug` — Turkish-aware slug generation, mirrored by `slugify` on the frontend.

### 3.3 Service responsibilities (bounded contexts kept intact)

No service was split or merged for convenience. New capability went into the context that
already owned the concept:

| Service | Owns | Added |
|---|---|---|
| **Identity** | users, roles, permissions, sessions, address book | real password hashing (PBKDF2, 100k iterations), refresh-token rotation with reuse detection, lockout, rate limiting, admin user management |
| **Catalog** | merchandising: products, taxonomy, media, promotions, inventory | categories (tree), product images/variants/reviews, coupons, campaigns, SEO fields, faceted search, media upload, stock decrement on checkout |
| **Basket** | the customer's current selections | wishlist, line quantity/removal, coupon on basket, TTL, idempotent checkout |
| **Order** | the order aggregate and its lifecycle | order number, totals, user link, status transitions, cancellation, back-office listing, analytics |
| **Payment** | the payment step | Guid-based contract, configurable outcome |
| **Notification** | outbound notifications | order status and low-stock handlers |

Wishlist lives in Basket rather than a new service: it is the same
"user-scoped list of product selections" the basket already owns.

---

## 4. API map (gateway paths)

### Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/products` | search, filter, sort, paginate |
| GET | `/products/facets` | filter values built from real data |
| GET | `/products/featured` · `/new-arrivals` · `/best-sellers` | home rails |
| GET | `/products/batch?ids=` | wishlist / recently viewed |
| GET | `/products/{slug}` · `/{slug}/related` | detail page |
| GET | `/products/{id}/reviews` · `/reviews/summary` | reviews |
| GET | `/categories` · `/categories/flat` · `/categories/featured` · `/{slug}` | taxonomy |
| GET | `/brands` · `/brands/{slug}` | brands |
| GET | `/campaigns?placement=Hero\|Banner\|Home\|Collection` | campaigns |
| POST | `/auth` · `/auth/login` · `/auth/register` · `/auth/refresh` · `/auth/logout` | authentication |

### Authenticated customer

`/auth/me` · `/auth/change-password` · `/addresses/**` · `/basket/**` ·
`/basket/wishlist/**` · `/coupons/validate` · `/orders` · `/orders/{id}` ·
`/orders/{id}/cancel` · `POST /products/{id}/reviews`

### Back office (permission-gated)

| Path | Permission |
|---|---|
| `/admin/products/**` | `products.write` (`products.read` to list) |
| `/admin/products/stats` | `analytics.read` |
| `/admin/categories/**` | `categories.write` |
| `/admin/brands/**` | `brands.write` |
| `/admin/coupons/**` | `coupons.write` |
| `/admin/campaigns/**` | `campaigns.write` |
| `/admin/reviews/**` | `products.write` |
| `/admin/media` | `products.write` |
| `/admin/orders` · `/admin/orders/{id}` | `orders.read` |
| `/admin/orders/{id}/status` | `orders.write` |
| `/admin/analytics/dashboard` | `analytics.read` |
| `/users/**` · `/roles/**` | `users.read` / `users.write` |

Legacy `/catalog/**` routes are untouched and still work.

---

## 5. The two flows that matter

### Admin creates a product → it appears in the shop

```
Admin form ──POST /admin/products──► CatalogService
                                        │ validate, unique slug, images, variants
                                        ▼
                                   velora_catalog
                                        │
Storefront ──GET /products/{slug}──────►┘
```

Publishing state, price and stock changes propagate the same way. Unpublishing a product
makes the storefront return **404**, verified by `scripts/verify-stack.py`.

### Customer checks out

```
POST /basket/checkout
   └─ BasketService: idempotency (x-request-id), publishes OrderCreated
        ├─► OrderService  : creates the Order aggregate, publishes OrderStarted
        │                    └─► PaymentService : publishes OrderPaymentSuccess / Failed
        │                          └─► OrderService : Paid, or Cancelled with a reason
        │                                └─► NotificationService
        ├─► CatalogService : decrements stock, increments SoldCount
        └─► BasketService  : clears the basket
```

Everything after the HTTP `202` is asynchronous over RabbitMQ. A handler that throws
now dead-letters the message (`*.dlx` queues) instead of silently dropping it.

### 5.3 Every message, and who listens

One direct exchange, `SellingBuddyEventBus`, plus `SellingBuddyEventBus.dlx` for failures.
Each subscriber gets its own durable queue named `{Service}.{Event}`, bound on the event name
as routing key, with a `.dlx` twin.

| Event | Published by | Consumed by | The listener's job |
|---|---|---|---|
| `OrderCreated` | BasketService | BasketService | empties the basket |
| | | CatalogService | reserves stock, raises `ProductStockChanged` |
| | | OrderService | creates the Order aggregate |
| `OrderStarted` | OrderService | PaymentService | attempts the authorisation |
| `OrderPaymentSuccess` | PaymentService | OrderService | moves the order to Paid |
| | | NotificationService | payment-confirmed notification |
| `OrderPaymentFailed` | PaymentService | OrderService | cancels with a reason |
| | | NotificationService | payment-failed notification |
| `OrderStatusChanged` | OrderService | NotificationService | status notification |
| `OrderPaid` | OrderService | CatalogService | increments the coupon `UsedCount` |
| | | NotificationService | receipt notification |
| `ProductStockChanged` | CatalogService | NotificationService | low-stock notification |
| `ProductPriceChanged` | CatalogService | — | published for future subscribers |

`scripts/verify-eventbus.py` asserts all of it against a live broker: the exchanges, all 12
queues, their bindings, a live consumer on each, then one real checkout traced hop by hop
through the RabbitMQ management counters, the side effect each handler owns, an empty backlog
and no growth in any dead-letter queue.

The same contracts run over Azure Service Bus by setting `EventBus:Type` to `AzureServiceBus`
and supplying `EventBus:ConnectionString` — no code changes. `EventBus.UnitTest` round-trips a
message over both transports.

---

## 6. Frontend

Two independently deployable Vite apps sharing one package:

| | Storefront | Admin |
|---|---|---|
| Port | 5173 | 5174 |
| UI | Tailwind + custom components | MUI + DataGrid + Tailwind layout |
| Motion | Framer Motion (reveal, parallax, sticky, hover) | minimal |
| Charts | — | Apache ECharts (tree-shaken) |
| Session key | `velora.store.session` | `velora.admin.session` |

Separate storage keys are deliberate: a storefront session must not grant back-office access.
The admin app additionally refuses to store a session for a non-staff account.

### State management

- **RTK Query** owns all server state (caching, deduplication, invalidation, optimistic updates).
- **Redux slices** own only UI state — drawers, toasts, auth status, recently viewed.
- Catalogue filters live in the **URL**, so a filtered view is shareable and the back button works.

### API layer

One axios client (`packages/shared/src/api/client.ts`) handles base URL, timeout, bearer
injection, `x-request-id`, single-flight refresh with a waiter queue, bounded retry for
idempotent requests, and error normalisation. No component touches axios.

### SEO

Per-route `<Seo>` with canonical, Open Graph, Twitter and JSON-LD (`Product` with offers and
aggregate rating, `BreadcrumbList`, `Organization`, `WebSite`). Filtered and paged permutations
are `noindex`; `robots.txt` excludes account and checkout paths.

The storefront is a client-rendered SPA, so these tags are applied by JavaScript. Crawlers that
execute JS read them correctly; if social-preview scraping becomes a requirement, put a
prerender layer in front of the static host — the tags are already in the right shape.

### i18n

`react-i18next` with Turkish and English. The English bundle is typed against the Turkish one,
so a missing key is a compile error rather than a runtime `undefined`.

---

## 7. Testing

```powershell
cd velora
pnpm test          # 109 unit tests (Vitest)
pnpm lint          # ESLint, zero warnings allowed
pnpm typecheck     # strict TypeScript
pnpm build         # production build of both apps
pnpm test:e2e      # Playwright (needs the backend running)
```

| Suite | Count | Covers |
|---|---|---|
| `packages/shared` | 62 | slug/format/URL helpers, all zod schemas, the Formik adapter, error normalisation |
| `apps/storefront` | 30 | UI + auth slices, ProductCard rendering and states |
| `apps/admin` | 17 | auth slice, permission selectors, chart theme integrity |

Playwright covers registration, login, browsing, search, filtering, cart, checkout, order
creation, admin login and full admin product CRUD.

Backend:

```powershell
dotnet build SellingBuddy.sln                              # 0 errors
dotnet test SellingBuddy/tests/BuildingBlocks/EventBus.UnitTest
python scripts/verify-stack.py                             # 60 checks, HTTP surface
python scripts/verify-eventbus.py                          # 32 checks, message flow
```

The broker tests are inconclusive rather than failing when no broker is reachable, so a clean
checkout stays green; the Azure ones skip unless `EventBus__ConnectionString` is set.

---

## 8. Security

| Concern | Where it is handled |
|---|---|
| Password storage | PBKDF2-HMAC-SHA256, 100k iterations, per-user salt, constant-time compare |
| Sessions | 60-minute access token; rotating refresh tokens stored **hashed**, with reuse detection that revokes the family |
| Brute force | 5 failed attempts → 15-minute lockout, plus IP rate limiting on the auth endpoints |
| Authorization | permission policies enforced by the API. The UI hides controls as a convenience, never as the gate |
| Ownership | a customer can only read their own basket, orders and addresses; identity always comes from the token, never the request body |
| Payment data | the CVV is explicitly `Ignore`d in the EF mapping and never persisted |
| Input validation | zod on the client, DataAnnotations + domain invariants on the server |
| CORS | allow-listed origins, configurable per environment |
| Media upload | extension **and** content-type allow-list, 5 MB cap, generated filenames, path-traversal guard |
| Idempotency | `x-request-id` prevents a retried checkout from creating two orders |

### Known limitations

- **Tokens are in `localStorage`.** Both clients are SPAs on a different origin from the API,
  where an HttpOnly cookie cannot be attached without a same-site backend. Mitigated by
  60-minute access tokens, refresh rotation with reuse detection, and a CSP that blocks
  third-party script origins. Move to HttpOnly cookies if the API is ever served from the
  storefront's own origin — that is the only configuration where they are strictly better.
- **The payment service is simulated.** It is a saga participant with the correct contract, not
  a PSP integration. `PaymentSuccess` decides the outcome of every authorisation.
- **The Azure Service Bus key committed in the original repository must be rotated.** It is no
  longer in the working tree, but git history still contains it. See section 8.1.

---

## 8.1 Configuration and secrets

No secret is committed. Every service reads configuration in this order, last wins:

```
appsettings.json               structure and non-secret defaults; secrets are blank
appsettings.Development.json   throwaway local credentials, safe to commit
environment variables          the real values in every other environment
```

A nested key maps to an environment variable by replacing `:` with `__`, so
`AuthConfig:Secret` comes from `AuthConfig__Secret`.

`Velora.Shared/Configuration/VeloraSecrets` enforces this at start-up:

| Setting | Development | Everywhere else |
|---|---|---|
| `AuthConfig:Secret` | falls back to a known placeholder | **required**, ≥32 chars, and the placeholder is rejected |
| `ConnectionStrings:*` / `OrderDbConnectionString` | falls back to the compose SQL Server | **required** |
| `SeedAdmin:Password` | falls back to `VELORA_SEED_ADMIN_PASSWORD` (ortam degiskeni) | no default — unset means no admin is created |
| `EventBus:*` | defaults to `localhost` RabbitMQ with guest/guest | set per environment |

A service that would otherwise start with a blank signing key refuses to boot and says which
variable to set. That is deliberate: a blank key rejects every token at runtime instead, which
is far harder to diagnose.

Rotating the leaked Azure key:

```powershell
az servicebus namespace authorization-rule keys renew `
  --resource-group EventBus-RG --namespace-name velora-servicebus `
  --name RootManageSharedAccessKey --key PrimaryKey
```

Then supply the new value as `EventBus__ConnectionString`; it is never written to a file again.

---

## 8.2 Production

Local development and production are separate paths that share no configuration file.

| | Local | Production |
|---|---|---|
| Runs from | `dotnet run` + `pnpm dev` | container images |
| Compose file | `docker-compose.infrastructure.yml` (infra only) | `docker-compose.prod.yml` (everything) |
| Environment | `Development` | `Production` |
| Secrets | local fallbacks in `appsettings.Development.json` | `.env`, never committed |
| Frontends | Vite dev server | static bundles on nginx |
| Schema | migrations applied at start-up, failures logged | migrations applied at start-up, failures stop the process |

```powershell
# 1. Fill in the environment
cp .env.example .env
# AUTH_SIGNING_KEY, SQL_SA_PASSWORD, REDIS_PASSWORD, RABBITMQ_PASSWORD are required.
#   openssl rand -base64 48

# 2. Build all nine images
docker compose -f docker-compose.prod.yml build

# 3. Start
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Notes that matter:

- **`VITE_*` values are build arguments, not runtime environment.** Vite inlines them into the
  bundle, so changing `API_PUBLIC_URL` or either origin means rebuilding the two frontend
  images, not restarting their containers.
- **`STOREFRONT_ORIGIN` and `ADMIN_ORIGIN` are also the CORS allow-list** the backend enforces.
  Getting one wrong blocks that app's API calls.
- **Put TLS in front of the gateway.** The stack speaks plain HTTP inside its own network and
  publishes only the gateway and the two static sites; terminate TLS in a reverse proxy or an
  ingress and keep the rest unpublished.
- **Prefer managed data services.** SQL Server, Redis and RabbitMQ are in the compose file so the
  stack is self-contained. Point the connection settings at Azure SQL, Azure Cache for Redis and
  Azure Service Bus instead and delete those three services — nothing else changes. Switching the
  bus is `EventBus__Type=AzureServiceBus` plus `EventBus__ConnectionString`.
- **Containers run as a non-root user**, and both nginx images send `X-Content-Type-Options`,
  `X-Frame-Options` (`DENY` for admin), `Referrer-Policy` and `Permissions-Policy` on every
  response, with `index.html` explicitly uncacheable so a deploy is picked up immediately.

---

## 9. Database

| Service | Database | Schema owner |
|---|---|---|
| Identity | `velora_identity` | EF Core migrations + seeder |
| Catalog | `velora_catalog` | EF Core migrations + seeder |
| Order | `velora_order` | EF Core migrations + seeder |
| Basket | Redis | keys `basket:` / `wishlist:` / `checkout:` |

Each service applies pending migrations at start-up (`Database.Migrate()`), then seeds. In
`Development` a failure is logged and the API still starts, so front-end work is not blocked;
anywhere else it stops the process rather than serving traffic against a mismatched schema.

Adding a migration after a model change:

```powershell
dotnet ef migrations add <Name> `
  --project SellingBuddy/src/Services/IdentityService/IdentityService.Api `
  --context IdentityDbContext --output-dir Infrastructure/Migrations

dotnet ef migrations add <Name> `
  --project SellingBuddy/src/Services/CatalogService/CatalogService.Api `
  --context CatalogContext --output-dir Infastructure/Migrations

dotnet ef migrations add <Name> `
  --project SellingBuddy/src/Services/OrderService/OrderService.Infrastructure `
  --context OrderDbContext --output-dir Migrations
```

Each context has an `IDesignTimeDbContextFactory`, so the CLI never builds the application host
— no broker, no Consul, no secret validation for a schema diff. Override the target database
with `VELORA_IDENTITY_CONNECTION`, `VELORA_CATALOG_CONNECTION` or `VELORA_ORDER_CONNECTION`.

To start from a clean slate (this **deletes data**, development only):

```powershell
./scripts/reset-databases.ps1
docker exec local-redis redis-cli FLUSHALL
```

### Seed data

17 Velora products across 4 root categories and 11 subcategories, 5 house brands, colour/size
variants, 4 campaigns and 4 coupons (`VELORA10`, `SEYAHAT15`, `KARGO`, `HOSGELDIN250`).

Product photography uses deterministic `picsum.photos` URLs so the demo looks finished offline
of any asset pipeline. Replace them with real assets, or upload through the admin media
endpoint, before launch.

---

## 10. Troubleshooting

**`PRECONDITION_FAILED - inequivalent arg 'x-dead-letter-exchange'`**
Queues created by an older build have no dead-letter policy. The service now logs a warning and
continues without dead-lettering. To enable it, delete the queues and restart:

```powershell
docker exec local-rabbitmq rabbitmqctl delete_queue BasketService.OrderCreated
# repeat for OrderService.OrderCreated, CatalogService.OrderCreated, PaymentService.OrderStarted
```

**Gateway returns `ServicesAreEmptyError`**
Consul has no *passing* instance. Check http://localhost:8500 — if the health checks are
critical, the agent cannot reach your host. Set `ConsulConfig:HealthCheckHost` to a host the
Consul container can resolve (`host.docker.internal` by default).

**Port 5000 already in use**
Run the gateway elsewhere (`dotnet run --urls http://localhost:5010`) and point the frontends at
it via `VITE_API_URL` in `velora/apps/*/.env`.

**Orders are created but stay `Submitted`**
PaymentService is not running, or its queue is not bound. Check `PaymentService.OrderStarted` in
the RabbitMQ console and the service log.

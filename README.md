# Law Firm — вэб сайт + харилцагчийн портал

Монголын хуулийн фирмийн нийтийн вэб сайт болон харилцагчийн порталын monorepo.
UI-ийн бүх текст монгол хэлээр, код болон comment англиар.

| Хэсэг | Технологи | Порт |
| --- | --- | --- |
| `apps/web` | Next.js 15 (App Router, TypeScript, Tailwind v4, Inter + Playfair Display) | 3000 |
| `apps/api` | NestJS 11 (Passport JWT, argon2, nestjs-zod, Swagger, Throttler, MinIO) | 4000 |
| `packages/shared` | Prisma 7 schema + client, zod schema, enum label, shared type | — |
| `docker-compose.yml` | PostgreSQL 16, MinIO (S3-compatible) + bucket үүсгэгч | 5432 / 9000 / 9001 |

Tooling: **pnpm workspaces + Turborepo**.

---

## 1. Ажиллуулах

```bash
# 0. Шаардлага: Node >= 20, pnpm 10 (corepack enable), Docker
cp .env.example .env            # секретүүдээ солино (openssl rand -hex 32)
pnpm install

docker compose up -d            # postgres + minio (+ bucket үүсгэнэ)
pnpm db:migrate                 # prisma migrate dev
pnpm db:seed                    # тест өгөгдөл (доорх нэвтрэх мэдээлэл)
pnpm dev                        # web :3000 + api :4000 хамт асна
```

- Вэб сайт: <http://localhost:3000>
- Портал: <http://localhost:3000/portal>
- API: <http://localhost:4000>, Swagger: <http://localhost:4000/docs> (зөвхөн dev)
- MinIO console: <http://localhost:9001> (minioadmin / minioadmin)

### Seed нэвтрэх мэдээлэл

| Эрх | И-мэйл | Утас | Нууц үг |
| --- | --- | --- | --- |
| ADMIN | admin@lawfirm.mn | 99110001 | `Admin123!` |
| LAWYER | enkhjargal@lawfirm.mn | 99110002 | `Lawyer123!` |
| LAWYER | oyunbileg@lawfirm.mn | 99110003 | `Lawyer123!` |
| CLIENT | client1@example.mn | 88110001 | `Client123!` |
| CLIENT | client2@example.mn | 88110002 | `Client123!` |

Seed нь 6 нийтэлсэн + 1 ноорог нийтлэл, 3 хэрэг (event, document, invoice-той), мэдэгдэл,
холбоо барих хүсэлт үүсгэнэ. Seed-ийн document бичлэгүүд MinIO дээр бодит файлгүй тул
татахад 404 өгнө; портал дээрээс шинээр хавсаргасан файлууд бодитоор хадгалагдана.

### Root script-үүд

| Команд | Тайлбар |
| --- | --- |
| `pnpm dev` | shared build → web + api dev горимд (turbo) |
| `pnpm build` | бүх package build |
| `pnpm lint` / `pnpm typecheck` | ESLint / tsc |
| `pnpm test` | Jest (apps/api) |
| `pnpm db:generate` | Prisma client generate |
| `pnpm db:migrate` | `prisma migrate dev` (dev) — prod-д `pnpm db:deploy` |
| `pnpm db:seed` | `prisma db seed` |
| `pnpm db:studio` | Prisma Studio |

---

## 2. Орчны хувьсагч (`.env`)

Нэг root `.env` файлыг гурван package бүгд уншина (api → `@nestjs/config`, shared → `prisma.config.ts`,
web → `next.config.ts`).

| Хувьсагч | Тайлбар | Жишээ |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL холболт | `postgresql://lawfirm:lawfirm@localhost:5432/lawfirm?schema=public` |
| `POSTGRES_USER/PASSWORD/DB/PORT` | docker-compose-д ашиглана | `lawfirm` |
| `PORT` | API порт | `4000` |
| `NODE_ENV` | `development` / `test` / `production` | |
| `JWT_ACCESS_SECRET` | Access JWT нууц (≥16 тэмдэгт) | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Refresh token hash-ийн HMAC түлхүүр | `openssl rand -hex 32` |
| `JWT_ACCESS_TTL` | Access token хугацаа | `15m` |
| `JWT_REFRESH_TTL_DAYS` | Refresh token хугацаа (хоног) | `7` |
| `CORS_ORIGIN` | Зөвшөөрөгдсөн origin (таслалаар) | `http://localhost:3000` |
| `COOKIE_DOMAIN` | Prod cookie domain (хоосон = host) | `.lawfirm.mn` |
| `MINIO_ENDPOINT/PORT/USE_SSL` | MinIO холболт | `localhost` / `9000` / `false` |
| `MINIO_ACCESS_KEY/SECRET_KEY` | MinIO нэвтрэлт | `minioadmin` |
| `MINIO_BUCKET` | Баримт хадгалах bucket (байхгүй бол API үүсгэнэ) | `law-firm-documents` |
| `NEXT_PUBLIC_API_URL` | Browser талын API URL | `http://localhost:4000` |
| `API_URL` | SSR/middleware талын API URL | `http://localhost:4000` |

API асахдаа env-ээ zod-оор шалгаж, дутуу/буруу бол жагсаалт хэвлээд зогсоно.

---

## 3. Бүтэц

```
law-firm/
├── apps/
│   ├── api/                     NestJS 11
│   │   └── src/
│   │       ├── auth/            login / register / refresh (rotation) / logout / me, JWT strategy
│   │       ├── users/           admin CRUD, PATCH /users/me, /users/me/password
│   │       ├── posts/           public list + slug (viewCount++), admin/lawyer CRUD, /posts/manage
│   │       ├── lawyers/         public хуульчдын профайл
│   │       ├── cases/           scope: CLIENT→өөрийн, LAWYER→хариуцсан, ADMIN→бүгд; events
│   │       ├── documents/       multipart upload → MinIO, presigned download (scope + visibility)
│   │       ├── invoices/        хэргийн scope-оор
│   │       ├── notifications/   list, read, read-all
│   │       ├── contact/         public POST (5/цаг/IP), admin list + status
│   │       ├── storage/         MinIO wrapper (upload, presignedGetUrl, delete) — global
│   │       ├── audit/           global interceptor: POST/PATCH/PUT/DELETE → AuditLog — global
│   │       ├── prisma/          PrismaService (shared client + adapter) — global
│   │       ├── common/          decorators (@Public, @Roles, @CurrentUser), guards, filter, utils
│   │       └── config/env.ts    zod env schema
│   └── web/                     Next.js 15
│       └── src/
│           ├── app/(site)/      /, about, services, lawyers[/id], news[/slug], faq, contact
│           ├── app/portal/      login + (dashboard): cases[/id], documents, invoices, notifications, profile
│           ├── components/      site header/footer, portal sidebar + user context, ui
│           ├── lib/api.ts       fetch wrapper (cookie credentials, 401 → refresh → retry)
│           ├── lib/api.server.ts  SSR-д cookie дамжуулдаг хувилбар
│           └── middleware.ts    /portal/* хамгаалалт
└── packages/shared/
    ├── prisma/schema.prisma     бүх модель, enum, index
    ├── prisma/seed.ts           argon2 hash-тай seed
    ├── prisma.config.ts         Prisma 7 config (DATABASE_URL, seed command)
    └── src/                     db.ts (client factory + singleton), schemas/ (zod), labels.ts, utils/
```

### Нэвтрэлтийн загвар

- `POST /auth/login` → body-д `accessToken` + `user`, cookie-д:
  - `access_token` (httpOnly, path `/`, 15 мин) — JWT strategy header **эсвэл** cookie-оос уншина
  - `refresh_token` (httpOnly, path `/auth`, 7 хоног) — DB-д HMAC-SHA256 hash-аар хадгална
  - `lf_session` (httpOnly, path `/`, 7 хоног) — токен агуулаагүй маркер; web middleware үүгээр сесс байгааг мэднэ
- `POST /auth/refresh` — хуучин токеныг revoke хийж шинийг олгоно. Revoke хийгдсэн токеныг дахин
  ашиглавал (theft) тухайн хэрэглэгчийн **бүх** сессийг хаана.
- Нууц үг солих / хэрэглэгч идэвхгүй болгох үед бүх refresh token revoke хийгдэнэ.

### Алдааны формат

```json
{ "statusCode": 403, "message": "Энэ хэргийг үзэх эрх танд байхгүй байна", "error": "Forbidden",
  "timestamp": "2026-09-14T14:30:38.427Z", "path": "/cases/…", "details": [] }
```

Zod validation → 400 + `details[{field,message}]`, Prisma P2002 → 409, P2025 → 404, бусад → 500 (stack нуугдана).

---

## 4. Тест

```bash
pnpm test            # эсвэл: pnpm --filter @law-firm/api test
```

Jest (unit + HTTP): auth (login email/phone, argon2, refresh rotation, reuse detection, logout, cookie flags),
cases scope (CLIENT өөр хүний хэрэг → 403, LAWYER scope, event visibility), posts public filter/viewCount/slug,
RolesGuard, exception filter, audit entity mapping. DB шаардахгүй (Prisma mock).

---

## 5. Production тэмдэглэл

- `pnpm build` → `apps/api/dist`, `apps/web/.next`. API: `node dist/main`, web: `next start`.
- API `trust proxy` = 1 (reverse proxy ард), cookie `secure` = true.
- Web ба API өөр subdomain дээр байвал `COOKIE_DOMAIN=.lawfirm.mn` тохируулна.
- Migration: `pnpm db:deploy`.

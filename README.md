# Law Firm — вэб сайт, харилцагчийн портал, админ самбар

Монголын хуулийн фирмийн нийтийн вэб сайт, харилцагчийн портал болон ажилтны (ADMIN / LAWYER) самбарын monorepo.
UI-ийн бүх текст монгол хэлээр, код болон comment англиар.

| Хэсэг | Технологи | Порт |
| --- | --- | --- |
| `apps/web` | Next.js 15 (App Router, TypeScript, Tailwind v4, Source Serif 4 + Inter) | 3001 |
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
pnpm dev                        # web :3001 + api :4000 хамт асна (3000-г өөр төсөл эзэлдэг)
```

- Вэб сайт: <http://localhost:3001>
- Портал: <http://localhost:3001/portal>
- Админ самбар: <http://localhost:3001/admin> (ADMIN, LAWYER-ээр нэвтэрнэ)
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
| `pnpm dev` | shared build → web :3001 + api :4000 dev горимд (turbo) |
| `pnpm build` | бүх package build |
| `pnpm lint` / `pnpm typecheck` | ESLint / tsc |
| `pnpm test` | Jest (apps/api) |
| `pnpm --filter @law-firm/web e2e` | Playwright e2e (web :3001 + api :4000 ажиллаж байх ёстой) |
| `pnpm --filter @law-firm/web e2e:screenshots` | Бүх хуудасны (админ орно) desktop/mobile screenshot → `apps/web/screenshots/` |
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
| `CORS_ORIGIN` | Зөвшөөрөгдсөн origin (таслалаар) | `http://localhost:3001` |
| `COOKIE_DOMAIN` | Prod cookie domain (хоосон = host) | `.lawfirm.mn` |
| `MINIO_ENDPOINT/PORT/USE_SSL` | MinIO холболт | `localhost` / `9000` / `false` |
| `MINIO_ACCESS_KEY/SECRET_KEY` | MinIO нэвтрэлт | `minioadmin` |
| `MINIO_BUCKET` | Баримт хадгалах bucket (байхгүй бол API үүсгэнэ) | `law-firm-documents` |
| `MINIO_PUBLIC_URL` | Нийтлэлийн cover зургийн (bucket-ийн `public/` prefix, public-read) browser-т харагдах base URL. Хоосон бол `http://MINIO_ENDPOINT:MINIO_PORT` | `https://files.lawfirm.mn` |
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
│   │       ├── users/           staff жагсаалт/шүүлт, ADMIN үүсгэх (түр нууц үг)/засах, PATCH /users/me, /users/me/password
│   │       ├── posts/           public list + slug (viewCount++), admin/lawyer CRUD, /posts/manage
│   │       ├── lawyers/         public хуульчдын профайл + /lawyers/:userId/profile удирдлага
│   │       ├── cases/           scope: CLIENT→өөрийн, LAWYER→хариуцсан, ADMIN→бүгд; staff CRUD, events, STATUS_CHANGE
│   │       ├── documents/       multipart upload → MinIO, presigned download (scope + visibility), DELETE
│   │       ├── invoices/        хэргийн scope-оор; үүсгэх (INV-YYYY-NNNN), төлөвийн шилжилт; дансны төлбөр тэмдэглэх, баталгаажуулах
│   │       ├── settings/        bank-account.ts — нэхэмжлэхийн төлбөр шилжүүлэх данс (одоогоор ЖИШЭЭ)
│   │       ├── document-requests/ баримтын хүсэлт: CRUD, submit (multipart), review, EventEmitter2 → мэдэгдэл
│   │       ├── messages/        хэргийн мессеж: cursor жагсаалт, илгээх, уншсан болгох, unread summary, inbox
│   │       ├── notifications/   list, read, read-all
│   │       ├── contact/         public POST (5/цаг/IP), admin list + status
│   │       ├── admin/           GET /admin/stats (хянах самбарын тоо, ойрын үйл явдал)
│   │       ├── storage/         MinIO wrapper (upload, uploadPublic, presignedGetUrl, delete) — global
│   │       ├── audit/           global interceptor: POST/PATCH/PUT/DELETE → AuditLog — global
│   │       ├── prisma/          PrismaService (shared client + adapter) — global
│   │       ├── common/          decorators (@Public, @Roles, @CurrentUser), guards, filter, utils
│   │       └── config/env.ts    zod env schema
│   └── web/                     Next.js 15 (Figma "00 Design System"-ээс хэрэгжүүлсэн UI)
│       ├── e2e/                 Playwright тестүүд + screenshot скрипт
│       └── src/
│           ├── app/globals.css  Figma variable → CSS var + Tailwind v4 @theme, text-h1…text-caption, shadow токен
│           ├── app/(site)/      /, about, services[/slug], lawyers[/id], news[/slug], faq, contact, 404
│           ├── app/portal/      login (нууц үг + OTP UI), register, forgot-password,
│           │                    (dashboard): cases[/id] (tabs), documents (drag-drop + preview),
│           │                    invoices[/id], messages (inbox), notifications, profile
│           ├── app/admin/       ажилтны самбар: dashboard, cases[/new|/id], clients[/id], lawyers[/id],
│           │                    posts[/new|/id/edit], invoices, contact, profile
│           ├── app/api/revalidate  нийтлэл хадгалахад /, /news, /news/[slug]-ийг шууд шинэчилнэ
│           ├── components/ui/   21 Figma компонент (Button cva, Input, Select, Badge, Card ×4, Table,
│           │                    NavHeader, Footer, Sidebar, BottomTabBar, Modal, Toast, …)
│           ├── components/icons Figma-с экспортолсон inline SVG
│           ├── components/admin AdminShell, modal-ууд (event, invoice, user, confirm), PostEditor, query hook
│           ├── components/messages ChatThread — админ болон порталын хэргийн чат
│           ├── content/         services.ts (CaseType-тэй уялдана), faq.ts, testimonials.ts
│           ├── lib/api.ts       fetch wrapper (cookie credentials, 401 → refresh → retry)
│           ├── lib/api.server.ts  SSR-д cookie дамжуулдаг хувилбар
│           └── middleware.ts    /portal/*, /admin/* хамгаалалт; CLIENT → /portal, ADMIN/LAWYER → /admin
└── packages/shared/
    ├── prisma/schema.prisma     бүх модель, enum, index
    ├── prisma/seed.ts           argon2 hash-тай seed
    ├── prisma.config.ts         Prisma 7 config (DATABASE_URL, seed command)
    └── src/                     db.ts (client factory + singleton), schemas/ (zod), labels.ts, utils/
```

### Дизайн систем

- Figma файл: `orRAIFzEIO9o3X5a6cDFb3` — "00 Design System" хуудас (variable 4 collection, 15 text style, 4 effect style, 21 компонент).
- Токенууд `apps/web/src/app/globals.css`-д Figma-ийн WEB syntax нэрээрээ (`--navy-800`, `--bg-surface`, `--text-primary` …); Tailwind utility нь `bg-bg-surface`, `text-text-primary`, `border-border-default` гэх мэт.
- Алтлаг `--gold-500` (#C9A227)-г цагаан дээр текстэнд хэрэглэхгүй; текстэнд `--text-accent` (= gold-700).
- Фонт: Source Serif 4 (гарчиг) + Inter (бие), кирилл subset, `next/font/google`.

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

## 4. Админ самбар (`/admin`)

ADMIN болон LAWYER портал login-оор нэвтэрмэгц `/admin` руу орно. CLIENT `/admin/*` руу орвол `/portal` руу,
нэвтрээгүй хэрэглэгч `/portal/login?next=…` руу шилжинэ. Middleware нь `access_token`-ийн role claim-ийг
зөвхөн чиглүүлэхэд ашигладаг; эрхийн жинхэнэ шалгалт API дээр явагдана.

### Эрхийн дүрэм

- **ADMIN** бүх хэрэг, харилцагч, хуульч, нийтлэл, нэхэмжлэх, хүсэлтийг удирдана.
- **LAWYER** зөвхөн өөрт хуваарилагдсан хэрэг, түүний үйл явдал, баримт, нэхэмжлэхийг удирдана.
  Шинэ хэрэг үүсгэхдээ зөвхөн өөрийгөө хариуцагчаар сонгоно. Харилцагчдыг зөвхөн харна, нийтлэлээс өөрийнхөө нийтлэлийг л засна.
- Хэргийг хариуцах хуульчийг зөвхөн ADMIN солино.
- API дээр global `RolesGuard` + `CasesService`-ийн хэргийн хандалтын шалгалт (CLIENT scope-ийн логикийг дахин ашигладаг).
  Бүх POST/PATCH/DELETE хүсэлт `AuditLog`-д бичигдэнэ.

### Хуудсууд

| Зам | Эрх | Агуулга |
| --- | --- | --- |
| `/admin` | ADMIN, LAWYER | Хянах самбар: тоон үзүүлэлт, ойрын үйл явдал |
| `/admin/cases` | ADMIN, LAWYER | Хэргийн жагсаалт, төлөв/төрөл/хуульчийн шүүлт, хайлт (URL-д хадгалагдана) |
| `/admin/cases/new` | ADMIN, LAWYER | Шинэ хэрэг, дугаар автоматаар олгогдоно |
| `/admin/cases/[id]` | ADMIN, хариуцсан LAWYER | Тойм · Явцын түүх · Баримт (харилцагчид харагдах эсэх) · Баримтын хүсэлт · Мессеж · Нэхэмжлэх; төлөв солих, хаах |
| `/admin/clients`, `/admin/clients/[id]` | ADMIN (LAWYER харна) | Харилцагч бүртгэх (түр нууц үг), засах, идэвхгүй болгох, хэргүүд |
| `/admin/lawyers`, `/admin/lawyers/[id]` | ADMIN | Хуульчийн бүртгэл, нийтийн профайл |
| `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]/edit` | ADMIN, LAWYER | Markdown editor + preview, cover зураг, slug автомат, Ноорог / Нийтлэх / Архивлах |
| `/admin/invoices` | ADMIN, LAWYER | Нэхэмжлэх үүсгэх, төлөвийн шилжилт, баталгаажуулах хүлээгдэж буй төлбөрийн шүүлт |
| `/admin/invoices/[id]` | ADMIN, хариуцсан LAWYER | Нэхэмжлэхийн дэлгэрэнгүй, харилцагчийн төлбөрийн тэмдэглэл, баталгаажуулах / татгалзах |
| `/admin/contact` | ADMIN | «Холбоо барих» хүсэлтүүд: Шинэ → Холбогдсон → Хаагдсан |
| `/admin/profile` | ADMIN, LAWYER | Бүртгэлийн мэдээлэл, нууц үг, (LAWYER) нийтийн профайл |

### API endpoint-ууд

| Endpoint | Эрх | Дүрэм |
| --- | --- | --- |
| `POST /cases` | ADMIN, LAWYER | `LF-YYYY-NNNN` автомат. ADMIN хуульч заавал сонгоно, LAWYER зөвхөн өөрийгөө |
| `PATCH /cases/:id` | ADMIN, хариуцсан LAWYER | Төлөв солиход `STATUS_CHANGE` event үүснэ |
| `PATCH /cases/:id/close` | ADMIN, хариуцсан LAWYER | `CLOSED` + `closedAt`, тэмдэглэлтэй event |
| `POST /cases/:id/events` | ADMIN, хариуцсан LAWYER | Харилцагчид харагдах HEARING / MEETING / DEADLINE нь харилцагчид мэдэгдэл илгээнэ |
| `PATCH /events/:id`, `DELETE /events/:id` | ADMIN, хариуцсан LAWYER | `STATUS_CHANGE` event-ийн төрлийг солихгүй |
| `POST /cases/:id/documents` | Хэргийн scope | multipart + `isVisibleToClient` |
| `DELETE /documents/:id` | ADMIN, upload хийсэн LAWYER | MinIO-оос мөн устгана |
| `POST /invoices` | ADMIN, хариуцсан LAWYER | `INV-YYYY-NNNN`, `DRAFT` төлөвтэй |
| `PATCH /invoices/:id` | ADMIN, хариуцсан LAWYER | DRAFT → SENT/CANCELLED, SENT → PAID/OVERDUE/CANCELLED, OVERDUE → PAID/CANCELLED. SENT үед мэдэгдэл, PAID үед `paidAt`. Дүн, тайлбарыг зөвхөн DRAFT үед засна |
| `GET /users`, `GET /users/:id` | ADMIN, LAWYER | LAWYER зөвхөн CLIENT хэрэглэгчдийг харна |
| `POST /users`, `PATCH /users/:id` | ADMIN | Нууц үг өгөөгүй бол 12 тэмдэгттэй түр нууц үг буцаана |
| `GET/POST/PATCH /lawyers/:userId/profile` | ADMIN, LAWYER (өөрийн) | Нийтийн профайл |
| `GET /admin/stats` | ADMIN, LAWYER | Хэрэглэгчийн scope-оор тооцно |
| `GET /posts/manage`, `GET /posts/manage/:id` | ADMIN, LAWYER (өөрийн) | Ноорог, архив орно |
| `POST /posts/cover` | ADMIN, LAWYER | JPG/PNG/WEBP, ≤5MB → MinIO `public/` → `{ url }` |
| `GET /contact`, `PATCH /contact/:id` | ADMIN | NEW → CONTACTED → CLOSED, буцаах боломжгүй |

Web талын `POST /api/revalidate` route нь нэвтэрсэн ADMIN/LAWYER-ийн хүсэлтээр `/`, `/news`, `/news/[slug]`-ийг
шууд шинэчилдэг тул нийтлэл хадгалмагц нийтийн сайтад гарна.

### E2E тестийг тусдаа DB дээр ажиллуулах

Админ e2e тест хэрэг, үйл явдал, мэдэгдэл үүсгэдэг тул dev DB-г бохирдуулахгүйн тулд `lawfirm_test` DB ашиглана.

```bash
docker compose exec postgres createdb -U lawfirm lawfirm_test      # нэг удаа
export DATABASE_URL="postgresql://lawfirm:lawfirm@localhost:5432/lawfirm_test?schema=public"
pnpm db:deploy && pnpm db:seed                                      # нэг удаа
pnpm build
node apps/api/dist/main &                                           # api :4000 (test DB)
pnpm --filter @law-firm/web start &                                 # web :3001
pnpm --filter @law-firm/web e2e
```

---

## 5. Баримтын хүсэлт (Document Request)

Хуульч харилцагчаас тодорхой баримтыг нэрлэж хүснэ. Харилцагч файлаар хариулж, хуульч хянаад батлах эсвэл шалтгаантай буцаана.
Нэг хүсэлтэд олон файл хавсарч болно. `Document.requestId` нь файлыг хүсэлттэй холбоно; `null` бол харилцагч өөрөө санаачилж хавсаргасан файл.

Одоо байгаа DB-д нэмэлт migration-ийг `pnpm db:deploy`-оор хэрэгжүүлнэ. `pnpm db:seed` нь LF-YYYY-0001 хэрэгт батлагдсан,
буцаагдсан, хүлээгдэж буй гурван жишээ хүсэлт нэмнэ.

### Төлөвийн шилжилт

| Одоогийн төлөв | Дараагийн төлөв | Хэн шилжүүлэх |
| --- | --- | --- |
| `PENDING` | `SUBMITTED` | хэргийн CLIENT файл илгээнэ |
| `SUBMITTED` | `UNDER_REVIEW`, `APPROVED`, `REJECTED` | ADMIN, хариуцсан LAWYER |
| `UNDER_REVIEW` | `APPROVED`, `REJECTED` | ADMIN, хариуцсан LAWYER |
| `REJECTED` | `SUBMITTED` | хэргийн CLIENT дахин илгээнэ |
| `APPROVED` | — | эцсийн төлөв |

- `REJECTED` шийдвэрт `rejectionReason` заавал.
- Хүсэлтийг зөвхөн `PENDING`, `REJECTED` үед засна. Файл хавсрагдаагүй бол л устгана.
- Хаагдсан хэрэгт шинэ хүсэлт үүсгэхгүй.
- Файл эхлээд MinIO-д хадгалагдана. DB бичилт амжилтгүй бол хадгалсан файлуудыг буцааж устгана.

### Endpoint-ууд

| Endpoint | Эрх | Тайлбар |
| --- | --- | --- |
| `GET /cases/:caseId/document-requests` | ADMIN, хариуцсан LAWYER, хэргийн CLIENT | Хүсэлтүүд, хавсаргасан файлтай нь; `?status=` шүүлт |
| `POST /cases/:caseId/document-requests` | ADMIN, хариуцсан LAWYER | `{ items: [{ title, description?, isRequired?, dueDate? }] }`, 1–20 мөр |
| `GET /document-requests/summary` | нэвтэрсэн бүх хэрэглэгч | Хэргээр тоолно: CLIENT → `PENDING` + `REJECTED`, ажилтан → `SUBMITTED` + `UNDER_REVIEW` |
| `PATCH /document-requests/:id` | ADMIN, хариуцсан LAWYER | `title`, `description`, `dueDate`, `isRequired` |
| `DELETE /document-requests/:id` | ADMIN, хариуцсан LAWYER | Файл хавсрагдаагүй үед |
| `POST /document-requests/:id/submit` | хэргийн CLIENT | multipart `files` (нэг удаад ≤10, тус бүр ≤20MB) → `SUBMITTED` |
| `POST /document-requests/:id/review` | ADMIN, хариуцсан LAWYER | `{ decision: "UNDER_REVIEW" / "APPROVED" / "REJECTED", rejectionReason? }` |

Бүх бичих хүсэлт `AuditLog`-д `document-requests` entity-ээр бичигдэнэ.

### Event → мэдэгдэл

`@nestjs/event-emitter` (EventEmitter2) ашиглана. Service event цацаж, `DocumentRequestNotificationsListener` мэдэгдэл үүсгэнэ.
Мэдэгдэл үүсгэхэд алдаа гарвал лог бичээд үндсэн үйлдлийг унагаахгүй.

| Event | Хүлээн авагч | Мэдэгдлийн гарчиг |
| --- | --- | --- |
| `document-request.created` | CLIENT | «Танаас баримт хүсэлээ: {title}» (олон мөр бол нэг мэдэгдэлд жагсаана) |
| `document-request.submitted` | хариуцсан LAWYER | «Баримт ирлээ: {title}» |
| `document-request.reviewed` | CLIENT | «Баримт хүлээн авлаа: {title}» эсвэл «Дахин илгээнэ үү: {rejectionReason}» |

Мэдэгдлийн холбоос `?tab=requests` параметрээр хэргийн «Баримтын хүсэлт» табыг шууд нээнэ. `UNDER_REVIEW` шийдвэр мэдэгдэл илгээхгүй.

### UI

- **Админ** `/admin/cases/[id]` → «Баримтын хүсэлт» таб: олон мөртэй «Баримт хүсэх» modal, төлөвийн шүүлт, хугацаа хэтэрсэн хүсэлт
  улаан хүрээтэй, «Хянаж эхлэх» / «Батлах» / «Буцаах» (шалтгаан заавал). Sidebar-ын «Хэргүүд» дээр хянах баримтын тоо харагдана.
- **Портал** `/portal/cases/[id]` → «Баримтын хүсэлт» таб checklist хэлбэрээр: файл сонгох эсвэл чирж оруулах, буцаагдсан шалтгаан
  улаанаар, «Дахин илгээх». Тойм табд анхааруулга, dashboard-д «Танаас {n} баримт хүсэлттэй байна» карт, sidebar-ын «Хэргүүд» дээр тоо гарна.

---

## 6. Хэргийн мессеж

Хэрэг бүрт харилцагч болон хэргийг хариуцсан хуульч шууд харилцана. Эхний хувилбар зөвхөн текст дамжуулна;
файл солилцохдоо «Баримтын хүсэлт»-ийг ашиглана. WebSocket байхгүй: нээлттэй чат 10 секунд тутам шинэчлэгдэнэ.

### Эрх ба хүлээн авагч

- Хэрэгт хандах эрхтэй хүн л уншиж, бичнэ: ADMIN, хариуцсан LAWYER, хэргийн CLIENT. Бусад хүсэлт 403 буцаана.
- CLIENT бичвэл хариуцсан хуульч хүлээн авна. LAWYER эсвэл ADMIN бичвэл харилцагч хүлээн авна.
- `readAt` нь хүлээн авагч тал уншсан цаг. ADMIN үзэгч тул уншаагүй тоо нь 0, чат нээхэд юу ч уншсан болохгүй.
- Мессежийн текст AuditLog-д хадгалагдахгүй: interceptor зөвхөн route, params, query бичдэг.

### Endpoint-ууд

| Endpoint | Тайлбар |
| --- | --- |
| `GET /cases/:caseId/messages` | Шинэ нь эхэндээ. `?cursor=<ачаалсан хамгийн хуучин id>&limit=30` (≤100) → `{ items, nextCursor }` |
| `POST /cases/:caseId/messages` | `{ body }`, trim хийсний дараа 1–2000 тэмдэгт. Илгээгч нь нэвтэрсэн хүн |
| `GET /cases/:caseId/messages/unread-count` | `{ count }` |
| `POST /cases/:caseId/messages/read` | Нөгөө талын уншаагүй мессежийг уншсан болгоно → `{ updated }` |
| `GET /messages/unread-summary` | Хэргээр бүлэглэсэн уншаагүй тоо (sidebar badge, dashboard карт) |
| `GET /messages/conversations` | Inbox: мессежтэй хэрэг бүрийн сүүлийн мессеж, уншаагүй тоо |

### Event → мэдэгдэл

`message.sent` event-ийг `MessageNotificationsListener` хүлээн авч «Шинэ мессеж: {хэргийн №}» мэдэгдэл үүсгэнэ.
Холбоос нь харилцагчид `/portal/cases/:id?tab=messages`, хуульчид `/admin/cases/:id?tab=messages`.
Тухайн чатын өмнөх мессежийн мэдэгдэл уншаагүй хэвээр байвал шинэ мэдэгдэл үүсгэхгүй (энгийн дедупликаци).

### UI

- **Админ** `/admin/cases/[id]` → «Мессеж» таб: өөрийн мессеж баруун, нөгөө талынх зүүн талд avatar, нэр, цагтай.
  Enter илгээнэ, Shift+Enter шинэ мөр. Таб нээхэд харилцагчийн мессеж уншсан болж, sidebar-ын «Хэргүүд» тоо шинэчлэгдэнэ.
- **Портал** `/portal/cases/[id]` → «Мессеж» таб ижил `ChatThread` компонентоор. `/portal/messages` нь хэрэг тус бүрийн
  сүүлийн мессеж, уншаагүй тоотой inbox. Sidebar-ын «Мессеж» дээр badge, dashboard-д «Уншаагүй {n} мессеж байна» карт гарна.
  «Хуульчтай холбогдох», «Мессеж бичих» товч чат табыг нээнэ.

---

## 7. Нэхэмжлэхийн төлбөр (данс, гар баталгаажуулалт)

Онлайн картын төлбөр байхгүй. Харилцагч фирмийн дансанд шилжүүлэг хийгээд порталаас «Төлбөр хийсэн» гэж тэмдэглэнэ.
ADMIN эсвэл хэргийг хариуцсан хуульч дансны хуулгаас тулгаад баталгаажуулна, эсвэл шалтгаантай татгалзана.

### Төлөвийн шилжилт

| Одоогийн төлөв | Дараагийн төлөв | Хэн |
| --- | --- | --- |
| `SENT`, `OVERDUE` | `AWAITING_CONFIRMATION` («Баталгаажуулж буй») | хэргийн CLIENT, `mark-paid` |
| `AWAITING_CONFIRMATION` | `PAID` | ADMIN, хариуцсан LAWYER, `confirm-payment` → `paidAt`, `confirmedById` |
| `AWAITING_CONFIRMATION` | `SENT` | ADMIN, хариуцсан LAWYER, `reject-payment` → `paymentRejectionReason` |

Бусад шилжилт (`DRAFT → SENT`, `SENT → PAID` гэх мэт) хуучин `PATCH /invoices/:id`-ээр хийгдэнэ. `PATCH` нь
`AWAITING_CONFIRMATION` руу оруулах, эсвэл тэндээс гаргахыг 400-аар хориглоно. Буруу шилжилт бүр 400 буцаана.

### Endpoint-ууд

| Endpoint | Эрх | Тайлбар |
| --- | --- | --- |
| `GET /settings/bank-account` | нэвтэрсэн бүх хэрэглэгч | `{ bankName, accountNumber, accountName }` |
| `POST /invoices/:id/mark-paid` | хэргийн CLIENT | `{ paymentNote? }` (≤500), `paymentMarkedAt` тавина |
| `POST /invoices/:id/confirm-payment` | ADMIN, хариуцсан LAWYER | `PAID`, `paidAt`, `confirmedById` |
| `POST /invoices/:id/reject-payment` | ADMIN, хариуцсан LAWYER | `{ reason }` заавал → `SENT` |
| `GET /invoices/payment-summary` | нэвтэрсэн бүх хэрэглэгч | Scope доторх баталгаажуулалт хүлээж буй төлбөр (sidebar badge) |

Бүх бичих хүсэлт `AuditLog`-д `invoices` entity-ээр бичигдэнэ.

### Event → мэдэгдэл

| Event | Хүлээн авагч | Мэдэгдлийн гарчиг |
| --- | --- | --- |
| `invoice.payment-marked` | хариуцсан LAWYER ба идэвхтэй бүх ADMIN | «Төлбөр хийгдсэн гэж тэмдэглэлээ, баталгаажуулна уу: {нэхэмжлэх №}» |
| `invoice.payment-confirmed` | CLIENT | «Төлбөр баталгаажлаа: {нэхэмжлэх №}» |
| `invoice.payment-rejected` | CLIENT | «Төлбөр баталгаажсангүй: {reason}» |

### UI

- **Портал** `/portal/invoices`, `/portal/invoices/[id]`: «Төлбөр төлөх» нь дансны мэдээлэл, төлөх дүн, гүйлгээний утгыг
  хуулах товчтой «Төлбөрийн заавар» modal нээнэ. «Төлбөр хийсэн» дарахад «Таны төлбөрийг хянаж байна» гарч, төлөх товч идэвхгүй болно.
  Татгалзсан бол шалтгаан улаанаар харагдаж, дахин тэмдэглэж болно. Dashboard-д «Төлбөр баталгаажуулж байна» карт тусдаа гарна.
- **Админ** `/admin/invoices`: «Баталгаажуулах хүлээгдэж буй» баннер, мөрийн тодотгол, төлөвийн шүүлт, sidebar-ын «Нэхэмжлэх» дээр тоо.
  `/admin/invoices/[id]`: харилцагчийн тэмдэглэл, тэмдэглэсэн цаг, «Төлбөр баталгаажуулах» болон «Татгалзах» (шалтгаан заавал).

### Бодит дансаар солих

Одоогийн данс нь **ЖИШЭЭ** утга: Хаан банк · 5023118822 · Тулгуур Хуулийн Фирм ХХН.

1. `apps/api/src/settings/bank-account.ts` доторх `bankName`, `accountNumber`, `accountName`-г бодит утгаар солиод
   «ЖИШЭЭ данс» гэсэн comment-ийг устгана. Дансны дугаарыг зайгүй бичнэ, портал өөрөө 4 оронгоор бүлэглэж харуулна.
2. `pnpm build` хийгээд API-г дахин асаана. Портал дансыг `GET /settings/bank-account`-аас уншдаг тул вебийн код өөрчлөх шаардлагагүй.
3. Нэвтэрсэн хэрэглэгчээр `GET /settings/bank-account` дуудаж, эсвэл порталын «Төлбөрийн заавар» modal-аас шалгана.
4. `apps/api/src/settings/settings.controller.spec.ts` доторх хүлээгдэж буй утгыг шинэ данстай тааруулна.
5. Seed-ийн `INV-YYYY-0002` дээрх «Хаан банкаар шилжүүлсэн» тэмдэглэл нь зөвхөн жишээ өгөгдөл.

---

## 8. Тест

```bash
pnpm test            # эсвэл: pnpm --filter @law-firm/api test
```

Jest (unit + HTTP): auth (login email/phone, argon2, refresh rotation, reuse detection, logout, cookie flags),
cases scope (CLIENT өөр хүний хэрэг → 403, LAWYER scope, event visibility), posts public filter/viewCount/slug,
RolesGuard, exception filter, audit entity mapping. Админ хэсэг: хэрэг үүсгэх/засах/хаах (LAWYER scope,
STATUS_CHANGE), event-ийн мэдэгдэл, нэхэмжлэхийн шилжилт, баримт устгах эрх, хэрэглэгч ба хуульчийн профайл,
admin stats, contact-ийн шилжилт, staff endpoint-уудын эрх (`x-test-role` header-тэй HTTP тест).
Баримтын хүсэлт: эрхийн scope (өөр хуульч, өөр харилцагч → 403), төлөвийн шилжилт, файл холбох, шалтгаангүй буцаалт → 400,
файлтай хүсэлт устгах → 400, EventEmitter2 wiring-ээр мэдэгдэл үүсэх. Мессеж: эрхгүй хүн → 403, хүлээн авагч,
cursor pagination, уншаагүй тоо ба уншсан болгох, мэдэгдлийн дедупликаци, body-ийн урт → 400. Төлбөр: өөрийн нэхэмжлэх тэмдэглэх, өөр харилцагч → 403, DRAFT/PAID → 400, баталгаажуулах (`paidAt`, `confirmedById`),
татгалзаад дахин тэмдэглэх, CLIENT баталгаажуулах → 403, бүх шатны мэдэгдэл, PATCH хамгаалалт. Нийт 249 тест, DB шаардахгүй (Prisma mock).

```bash
pnpm --filter @law-firm/web e2e     # Playwright, web :3001 + api :4000 ажиллаж байх ёстой
```

Playwright (17 тест): нийтийн сайт (2), портал (2), админ (4), баримтын хүсэлт (3), мессеж (3), төлбөр (3):
- LAWYER хэрэг үүсгэж шүүх хурал нэмэхэд харилцагч порталдаа болон мэдэгдлээс харна.
- ADMIN нийтлэл нийтлэхэд нийтийн `/news` болон нийтлэлийн хуудсанд шууд гарна (тест дараа нь устгана).
- LAWYER өөр хуульчийн хэрэг рүү `/admin/cases/[id]`-ээр орвол 403 хуудас, `PATCH /cases/:id` нь 403.
- Нэвтрээгүй хэрэглэгч login руу, CLIENT `/admin`-аас `/portal` руу шилжинэ.
- LAWYER баримт хүсэх → CLIENT порталд файл илгээх → LAWYER батлах → CLIENT талд «Хүлээн авсан».
- LAWYER шалтгаантай буцаах → CLIENT шалтгааныг харж дахин илгээх → LAWYER талд дахин «Илгээсэн».
- Өөр харилцагч хүсэлтэд файл илгээх, хүсэлтийг харах → 403; хэргийн хуудас нь 403.
- CLIENT мессеж илгээх → LAWYER мэдэгдлийн холбоосоор чатад орж хариулах → CLIENT-ийн нээлттэй чатад хариу polling-оор гарах.
- Inbox дээр уншаагүй тоо харагдаж, чатыг нээхэд 0 болох.
- Өөр харилцагч, өөр хуульч мессежийн API болон чат табаар орвол 403.
- CLIENT төлбөр тэмдэглэх → админд «Баталгаажуулж буй» харагдах → баталгаажуулах → CLIENT талд «Төлөгдсөн».
- Татгалзах → шалтгаан порталд харагдах → дахин тэмдэглэх → админд дахин хүлээгдэж буй.
- Өөр харилцагч тэмдэглэх, CLIENT баталгаажуулах → 403; ноорог нэхэмжлэх тэмдэглэх → 400.

---

## 9. Production тэмдэглэл

- `pnpm build` → `apps/api/dist`, `apps/web/.next`. API: `node dist/main`, web: `next start`.
- API `trust proxy` = 1 (reverse proxy ард), cookie `secure` = true.
- Web ба API өөр subdomain дээр байвал `COOKIE_DOMAIN=.lawfirm.mn` тохируулна.
- Migration: `pnpm db:deploy`.

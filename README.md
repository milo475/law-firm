# Law Firm — вэб сайт, харилцагчийн портал, админ самбар

Монголын хуулийн фирмийн нийтийн вэб сайт, харилцагчийн портал болон ажилтны (ADMIN / LAWYER) самбарын monorepo.
UI-ийн бүх текст монгол хэлээр, код болон comment англиар.

| Хэсэг | Технологи | Порт |
| --- | --- | --- |
| `apps/web` | Next.js 15 (App Router, TypeScript, Tailwind v4, Source Serif 4 + Inter) | 3001 |
| `apps/api` | NestJS 11 (Passport JWT, argon2, nestjs-zod, Swagger, Throttler, AWS S3 SDK → R2) | 4000 |
| `packages/shared` | Prisma 7 schema + client, zod schema, enum label, shared type | — |
| `docker-compose.yml` | PostgreSQL 16, MinIO (prod дээрх Cloudflare R2-ын локал орлуулагч) + bucket үүсгэгч | 5432 / 9000 / 9001 |

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

Docker ашиглахгүй бол Postgres, MinIO-г локалаар нь асаана (`.env`-ийн түлхүүрүүдээр):

```bash
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin \
  minio server ~/minio-data --address :9000 --console-address :9001 &
```

MinIO унтраалттай үед баримт/хавсралт хуулах хүсэлт 500 буцаана (бусад хэсэг хэвийн ажиллана).

Файл хадгалалт S3 API дээр ажиллана: production-д **Cloudflare R2**, локалд ижил клиент MinIO руу
заана (`R2_ENDPOINT=http://localhost:9000`). Bucket байхгүй бол зөвхөн локалд (production биш үед)
API өөрөө үүсгээд `public/` prefix-ийг нээнэ; R2 дээр bucket болон нийтийн хандалтыг Cloudflare
dashboard дээр тохируулна.

### Seed нэвтрэх мэдээлэл

| Эрх | И-мэйл | Утас | Нууц үг |
| --- | --- | --- | --- |
| ADMIN | admin@lawfirm.mn | 99110001 | `Admin123!` |
| LAWYER | enkhjargal@lawfirm.mn | 99110002 | `Lawyer123!` |
| LAWYER | oyunbileg@lawfirm.mn | 99110003 | `Lawyer123!` |
| CLIENT | client1@example.mn | 88110001 | `Client123!` |
| CLIENT | client2@example.mn | 88110002 | `Client123!` |

Seed нь 6 нийтэлсэн + 1 ноорог нийтлэл, 3 хэрэг (event, document, invoice, баримтын хүсэлт,
мессежтэй), 6 даалгавар, 4 үйлчилгээний хүсэлт, мэдэгдэл үүсгэнэ. Seed-ийн document бичлэгүүд
MinIO дээр бодит файлгүй тул татахад 404 өгнө; портал дээрээс шинээр хавсаргасан файлууд бодитоор
хадгалагдана.

Seed нь **идемпотент**: дахин ажиллуулахад өөрийн эзэмшдэг жишээ мөрүүдийг дарж бичнэ, давхардуулахгүй.
Ажиллахдаа аль DB-д бичиж байгаагаа хэвлэдэг, `NODE_ENV=production` үед `--force`-гүйгээр татгалзана.

### Root script-үүд

| Команд | Тайлбар |
| --- | --- |
| `pnpm dev` | shared build → web :3001 + api :4000 dev горимд (turbo) |
| `pnpm build` | бүх package build |
| `pnpm lint` / `pnpm typecheck` | ESLint / tsc |
| `pnpm test` | Jest (apps/api + packages/shared) |
| `pnpm --filter @law-firm/web e2e` | Playwright e2e (web :3001 + api :4000 ажиллаж байх ёстой) |
| `pnpm --filter @law-firm/web e2e:screenshots` | Бүх хуудасны (админ орно) desktop/mobile screenshot → `apps/web/screenshots/` |
| `pnpm db:generate` | Prisma client generate |
| `pnpm db:migrate` | `prisma migrate dev` (dev) — prod-д `pnpm db:deploy` |
| `pnpm db:seed` | `prisma db seed` — жишээ өгөгдөл (идемпотент) |
| `pnpm db:clean` | Тестийн үлдэгдэл өгөгдлийг устгана (зөвхөн `*_test` DB) |
| `pnpm db:admin` | ADMIN хэрэглэгч үүсгэх / нууц үгийг нь сэргээх (deploy хийсний дараа эхний админ) |
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
| `REMINDERS_ENABLED` | Өдөр тутмын сануулга асаах/унтраах (`NODE_ENV=test` үед хэзээ ч ажиллахгүй) | `true` |
| `REMINDERS_CRON` | Сануулгын cron (серверийн цаг, сек мин цаг өдөр сар гараг) | `0 0 8 * * *` |
| `THROTTLE_LIMIT` | API-ийн глобал хязгаар: нэг IP-ээс минутад илгээх хүсэлт (default 120). E2E-г нэг машинаас ажиллуулахад өсгөнө | `120` |
| `REFRESH_REUSE_GRACE_SECONDS` | Rotate хийгдсэн refresh токеныг өөр таб дахин илгээхэд бүх сессийг хаахгүй байх хугацаа (сек, `0` = унтраах) | `30` |
| `COOKIE_PATH_PREFIX` | Браузерт API ямар зам дор харагдаж байгаа нь. Хоосон = шууд дуудаж байна (refresh cookie `/auth`); `/api` = вэб дамжуулж байна (`/api/auth`) | `` / `/api` |
| `TRUST_PROXY_HOPS` | API-ийн өмнөх proxy-ийн тоо (зөвхөн `NODE_ENV=production` үед). Railway: edge → web → api = 2 | `1` |
| `R2_ENDPOINT` | S3 endpoint. R2: `https://<account-id>.r2.cloudflarestorage.com`, локал MinIO: `http://localhost:9000` | `http://localhost:9000` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token (Object Read & Write) эсвэл MinIO-гийн түлхүүр | `minioadmin` |
| `R2_BUCKET` | Баримт хадгалах bucket (R2 дээр dashboard-оос үүсгэнэ; локалд API өөрөө үүсгэнэ) | `law-firm-documents` |
| `R2_PUBLIC_URL` | Нийтлэлийн cover зургийн (bucket-ийн `public/` prefix) browser-т харагдах base URL — **bucket-ийн root**. R2: `https://pub-xxxx.r2.dev`, MinIO: `http://localhost:9000/<bucket>` | `https://cdn.lawfirm.mn` |
| `NEXT_PUBLIC_API_URL` | Browser талын API URL. `/api` бол вэбийн ижил origin дээрх proxy | `http://localhost:4000` / `/api` |
| `API_URL` | SSR/middleware талын, мөн `/api` proxy-ийн очих API URL (үргэлж бүтэн хаяг) | `http://localhost:4000` |

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
│   │       ├── documents/       multipart upload → R2/MinIO, presigned download (scope + visibility), DELETE
│   │       ├── invoices/        хэргийн scope-оор; үүсгэх (INV-YYYY-NNNN), төлөвийн шилжилт; дансны төлбөр тэмдэглэх, баталгаажуулах
│   │       ├── settings/        GET/PUT /settings/bank-account, /settings/firm — данс ба фирмийн мэдээлэл (Setting хүснэгт, ADMIN засна)
│   │       ├── document-requests/ баримтын хүсэлт: CRUD, submit (multipart), review, EventEmitter2 → мэдэгдэл
│   │       ├── messages/        хэргийн мессеж: cursor жагсаалт, илгээх, уншсан болгох, unread summary, inbox
│   │       ├── notifications/   list, read, read-all
│   │       ├── service-requests/ CLIENT хүсэлт гаргах/өөрийн; ADMIN жагсаалт, хүлээж авах, татгалзах, хуваарилах → Case; EventEmitter2
│   │       ├── contact/         хуучин «Холбоо барих» маягтын мессежүүд — ADMIN зөвхөн унших
│   │       ├── admin/           GET /admin/stats (хянах самбарын тоо, ойрын үйл явдал)
│   │       ├── storage/         S3 wrapper (R2/MinIO): upload, uploadPublic, presignedGetUrl, delete — global
│   │       ├── audit/           global interceptor: POST/PATCH/PUT/DELETE → AuditLog — global
│   │       ├── prisma/          PrismaService (shared client + adapter) — global
│   │       ├── common/          decorators (@Public, @Roles, @CurrentUser), guards, filter, utils
│   │       └── config/env.ts    zod env schema
│   └── web/                     Next.js 15 (Figma "00 Design System"-ээс хэрэгжүүлсэн UI)
│       ├── e2e/                 Playwright тестүүд + screenshot скрипт; global-setup.ts (DB цэвэрлэгээ)
│       └── src/
│           ├── app/globals.css  Figma variable → CSS var + Tailwind v4 @theme, text-h1…text-caption, shadow токен
│           ├── app/(site)/      /, about, services[/slug], lawyers[/id], news[/slug], faq, contact, privacy, terms, 404
│           ├── app/portal/      login (нууц үг + OTP UI), register, forgot-password,
│           │                    (dashboard): cases[/id] (tabs), documents (drag-drop + preview),
│           │                    invoices[/id], messages (inbox), requests[/new], notifications, profile
│           ├── app/admin/       ажилтны самбар: dashboard, cases[/new|/id], clients[/id], lawyers[/id],
│           │                    posts[/new|/id/edit], invoices[/id], requests[/id], settings, profile
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
    ├── prisma/seed.ts           argon2 hash-тай seed (идемпотент)
    ├── prisma/clean-test-data.ts  `pnpm db:clean` — тестийн үлдэгдлийг цэвэрлэнэ (зөвхөн *_test DB)
    ├── prisma/create-admin.ts   `pnpm db:admin` — ADMIN үүсгэх/нууц үг сэргээх (argon2id)
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
- `POST /auth/refresh` — хуучин токеныг revoke хийж (`rotatedAt`) ижил session family (`familyId`)-д шинийг олгоно. Revoke
  хийгдсэн токеныг дахин ашиглавал (theft) тухайн хэрэглэгчийн **бүх** сессийг хаана.
- **Олон таб:** хоёр таб (эсвэл дахин илгээсэн хүсэлт) нэг токеныг зэрэг ирүүлбэл хоёр дахь нь аль хэдийн rotate
  хийгдсэн байдаг. `REFRESH_REUSE_GRACE_SECONDS` (default 30, `0` = унтраах) дотор rotate хийгдсэн, family нь идэвхтэй
  токентой бол энэ нь хулгай биш: тухайн хүсэлт ижил family-д өөрийн шинэ токен авна. Хугацаа хэтэрсэн, logout эсвэл нууц үг
  солисны дараах (family-д идэвхтэй токен үлдээгүй), мөн logout-оор revoke хийгдсэн токеныг дахин ашиглах нь өмнөх шигээ бүх сессийг хаана.
- Нууц үг солих / хэрэглэгч идэвхгүй болгох үед бүх refresh token revoke хийгдэнэ.
- Web api client 401 авбал (`/auth/me` ч мөн) нэг удаа `POST /auth/refresh` дуудаж дахин оролдоно; зөвхөн
  login / register / refresh / logout үүнийг алгасна. Refresh амжилтгүй бол API бүх cookie-г цэвэрлэдэг тул
  хүчингүй болсон сесс (өөр DB-ийн эсвэл хугацаа нь дууссан) `/portal` ↔ `/portal/login` хооронд эргэлдэхгүй.

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
- **LAWYER** зөвхөн өөрийн багийн гишүүн болсон хэрэг, түүний үйл явдал, баримт, нэхэмжлэхийг удирдана (8-р хэсэг).
  Шинэ хэрэг үүсгэхдээ зөвхөн өөрийгөө хариуцагчаар сонгоно. Харилцагчдыг зөвхөн харна, нийтлэлээс өөрийнхөө нийтлэлийг л засна.
- Хэргийн үндсэн мэдээлэл, төлөв, багийг зөвхөн ахлах хуульч (LEAD) эсвэл ADMIN өөрчилнө. Ахлахыг ADMIN «Тойм»-оос,
  эсвэл одоогийн ахлах хуульч «Баг» табаас шилжүүлнэ.
- API дээр global `RolesGuard` + `CasesService`-ийн хэргийн хандалтын шалгалт (CLIENT scope-ийн логикийг дахин ашигладаг).
  Бүх POST/PATCH/DELETE хүсэлт `AuditLog`-д бичигдэнэ.

### Хуудсууд

| Зам | Эрх | Агуулга |
| --- | --- | --- |
| `/admin` | ADMIN, LAWYER | Хянах самбар: тоон үзүүлэлт, ойрын үйл явдал |
| `/admin/cases` | ADMIN, LAWYER | Хэргийн жагсаалт, төлөв/төрөл/хуульчийн шүүлт, хайлт (URL-д хадгалагдана) |
| `/admin/cases/new` | ADMIN, LAWYER | Шинэ хэрэг, дугаар автоматаар олгогдоно |
| `/admin/cases/[id]` | ADMIN, багийн LAWYER | Тойм · Явцын түүх · Баримт (харилцагчид харагдах эсэх) · Баримтын хүсэлт · Мессеж · Нэхэмжлэх · Баг · Даалгавар; төлөв солих, хаах (LEAD, ADMIN) |
| `/admin/tasks` | ADMIN, LAWYER | Даалгаврын жагсаалт ба Kanban самбар, шүүлт (URL-д хадгалагдана) |
| `/admin/tasks/[id]` | ADMIN, харах эрхтэй LAWYER | Даалгаврын дэлгэрэнгүй, төлөв, засах, устгах, коммент |
| `/admin/clients`, `/admin/clients/[id]` | ADMIN (LAWYER харна) | Харилцагч бүртгэх (түр нууц үг), засах, идэвхгүй болгох, хэргүүд |
| `/admin/lawyers`, `/admin/lawyers/[id]` | ADMIN | Хуульчийн бүртгэл, нийтийн профайл |
| `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]/edit` | ADMIN, LAWYER | Markdown editor + preview, cover зураг, slug автомат, Ноорог / Нийтлэх / Архивлах |
| `/admin/invoices` | ADMIN, LAWYER | Нэхэмжлэх үүсгэх, төлөвийн шилжилт, баталгаажуулах хүлээгдэж буй төлбөрийн шүүлт |
| `/admin/invoices/[id]` | ADMIN, багийн LAWYER | Нэхэмжлэхийн дэлгэрэнгүй, харилцагчийн төлбөрийн тэмдэглэл, баталгаажуулах / татгалзах |
| `/admin/requests`, `/admin/requests/[id]` | ADMIN | Үйлчилгээний хүсэлт: шүүлт, хүлээж авах / татгалзах / өмгөөлөгч эсвэл баг хуваарилах. Хуучин `/admin/contact` энд шилждэг |
| `/admin/profile` | ADMIN, LAWYER | Бүртгэлийн мэдээлэл, нууц үг, (LAWYER) нийтийн профайл |
| `/admin/notifications` | ADMIN, LAWYER | Өөрийн мэдэгдэл: бүгд / уншаагүй / уншсан, «Цааш үзэх», бүгдийг уншсан болгох |
| `/admin/performance` | ADMIN, LAWYER | Даалгаврын ачаалал ба явц: хугацааны таб, тоймын карт, график, хүн бүрийн хүснэгт |
| `/admin/performance/[userId]` | ADMIN, багийн хамтрагч LAWYER | Нэг ажилтны үзүүлэлт, төлөв/ач холбогдлын задаргаа, сүүлийн даалгавар |

### API endpoint-ууд

| Endpoint | Эрх | Дүрэм |
| --- | --- | --- |
| `POST /cases` | ADMIN, LAWYER | `LF-YYYY-NNNN` автомат. ADMIN хуульч заавал сонгоно, LAWYER зөвхөн өөрийгөө |
| `PATCH /cases/:id` | ADMIN, ахлах LAWYER | Төлөв солиход `STATUS_CHANGE` event үүснэ |
| `PATCH /cases/:id/close` | ADMIN, ахлах LAWYER | `CLOSED` + `closedAt`, тэмдэглэлтэй event |
| `POST /cases/:id/events` | ADMIN, багийн LAWYER | Харилцагчид харагдах HEARING / MEETING / DEADLINE нь харилцагчид мэдэгдэл илгээнэ |
| `PATCH /events/:id`, `DELETE /events/:id` | ADMIN, багийн LAWYER | `STATUS_CHANGE` event-ийн төрлийг солихгүй |
| `POST /cases/:id/documents` | Хэргийн scope | multipart + `isVisibleToClient` |
| `DELETE /documents/:id` | ADMIN, upload хийсэн LAWYER | Обьект хадгалалтаас мөн устгана |
| `POST /invoices` | ADMIN, багийн LAWYER | `INV-YYYY-NNNN`, `DRAFT` төлөвтэй |
| `PATCH /invoices/:id` | ADMIN, багийн LAWYER | DRAFT → SENT/CANCELLED, SENT → PAID/OVERDUE/CANCELLED, OVERDUE → PAID/CANCELLED. SENT үед мэдэгдэл, PAID үед `paidAt`. Дүн, тайлбарыг зөвхөн DRAFT үед засна |
| `GET /users`, `GET /users/:id` | ADMIN, LAWYER | LAWYER зөвхөн CLIENT хэрэглэгчдийг харна |
| `POST /users`, `PATCH /users/:id` | ADMIN | Нууц үг өгөөгүй бол 12 тэмдэгттэй түр нууц үг буцаана |
| `GET/POST/PATCH /lawyers/:userId/profile` | ADMIN, LAWYER (өөрийн) | Нийтийн профайл |
| `GET /admin/stats` | ADMIN, LAWYER | Хэрэглэгчийн scope-оор тооцно |
| `GET /posts/manage`, `GET /posts/manage/:id` | ADMIN, LAWYER (өөрийн) | Ноорог, архив орно |
| `POST /posts/cover` | ADMIN, LAWYER | JPG/PNG/WEBP, ≤5MB → bucket-ийн `public/` → `{ url }` |
| `GET /contact` | ADMIN | Хуучин «Холбоо барих» маягтын мессежүүд, зөвхөн унших |

Web талын `POST /api/revalidate` route нь нэвтэрсэн ADMIN/LAWYER-ийн хүсэлтээр `/`, `/news`, `/news/[slug]`-ийг
шууд шинэчилдэг тул нийтлэл хадгалмагц нийтийн сайтад гарна.

### E2E тестийг тусдаа DB дээр ажиллуулах

Админ e2e тест хэрэг, үйл явдал, мэдэгдэл үүсгэдэг тул dev DB-г бохирдуулахгүйн тулд `lawfirm_test` DB ашиглана.

```bash
docker compose exec postgres createdb -U lawfirm lawfirm_test      # нэг удаа
export DATABASE_URL="postgresql://lawfirm:lawfirm@localhost:5432/lawfirm_test?schema=public"
pnpm db:deploy && pnpm db:seed                                      # нэг удаа
pnpm build
THROTTLE_LIMIT=1000 node apps/api/dist/main &                       # api :4000 (test DB); e2e нэг IP-ээс олон хүсэлт илгээдэг
pnpm --filter @law-firm/web start &                                 # web :3001
pnpm --filter @law-firm/web e2e
```

### Тест өгөгдлийг цэвэрлэх (`pnpm db:clean`)

E2E тест бүр шинэ хэрэг, нэхэмжлэх, даалгавар үүсгэдэг тул тестийн DB хуримтлагдаж,
жагсаалтын хуудаслалт тогтворгүй болдог. Тестийн мөрийг жишээ (seed) мөрөөс **нэрээр** нь ялгана:

| Дүрэм | Жишээ |
| --- | --- |
| Тестийн үүсгэсэн бүх мөрийн гарчиг/бие `E2E ` угтвартай | `E2E багийн хэрэг 7f3a` |
| Тестийн бүртгүүлсэн хэрэглэгчийн и-мэйл `e2e.` угтвартай | `e2e.perf.7f3a@lawfirm.mn` |

Гараар туршихад ч энэ угтварыг ашиглавал цэвэрлэгээнд автоматаар хамрагдана. Дүрмийг
`packages/shared/src/utils/test-data.ts` тодорхойлж, unit тестээр баталгаажуулсан.

```bash
export DATABASE_URL="postgresql://lawfirm:lawfirm@localhost:5432/lawfirm_test?schema=public"
pnpm db:clean --dry-run          # юу устахыг харуулна, юу ч устгахгүй
pnpm db:clean                    # цэвэрлэнэ
pnpm db:clean && pnpm db:seed    # DB-г яг жишээ өгөгдлийн төлөвт буцаана
```

`pnpm db:clean` нь дараахыг устгана: угтвартай мөрүүд болон `e2e.` хэрэглэгчид (тэдгээрт
холбогдох хэрэг, нэхэмжлэх, мессеж, баримт, даалгавар нь хамт), устсан мөр рүү заасан
мэдэгдэл ба audit бичлэг, хугацаа нь дууссан/цуцлагдсан refresh token. Seed-ийн жишээ мөрүүд,
`Setting` тохиргоо хөндөгдөхгүй.

| Flag | Үйлдэл |
| --- | --- |
| `--dry-run` | Зөвхөн тоог хэвлэнэ (устгахаас өмнөх байдлаар — бодит ажиллагаанд илүү мөр устана) |
| `--prefix <текст>` | Нэмэлт угтварыг тестийн өгөгдөл гэж үзнэ (хуучин үлдэгдэлд, давтаж болно) |
| `--audit` | Audit log-ийг бүхэлд нь хоослоно (нэвтрэлтийн бичлэгийн чимээ) |
| `--sessions` | Бүх refresh token-ыг устгана (бүх сесс гарна) |
| `--force <DB нэр>` | `*_test` биш DB-г зөвшөөрнө — нэрийг нь яг давтаж бичнэ |

**Хамгаалалт:** script нь `test`, `*_test` нэртэй DB-г л зөвшөөрнө. Dev DB (`lawfirm`) дээр
ажиллуулахыг оролдвол алдаа өгч зогсоно, өгөгдөлд гар хүрэхгүй.

Playwright-ийн `globalSetup` (`apps/web/e2e/global-setup.ts`) нь suite эхлэхийн өмнө үүнийг
`--audit --sessions`-тэй автоматаар дуудна — `DATABASE_URL` тестийн DB-г заасан үед л. Тиймээс
өмнөх ажиллагааны үлдэгдэл дээр шинэ ажиллагаа овоолохоо больсон.

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
- Файл эхлээд обьект хадгалалтад (R2/MinIO) орно. DB бичилт амжилтгүй бол хадгалсан файлуудыг буцааж устгана.

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

- Хэрэгт хандах эрхтэй хүн л уншиж, бичнэ: ADMIN, багийн LAWYER, хэргийн CLIENT. Бусад хүсэлт 403 буцаана.
- CLIENT бичвэл ахлах хуульч хүлээн авна. LAWYER эсвэл ADMIN бичвэл харилцагч хүлээн авна.
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
| `AWAITING_CONFIRMATION` | `PAID` | ADMIN, багийн LAWYER, `confirm-payment` → `paidAt`, `confirmedById` |
| `AWAITING_CONFIRMATION` | `SENT` | ADMIN, багийн LAWYER, `reject-payment` → `paymentRejectionReason` |

Бусад шилжилт (`DRAFT → SENT`, `SENT → PAID` гэх мэт) хуучин `PATCH /invoices/:id`-ээр хийгдэнэ. `PATCH` нь
`AWAITING_CONFIRMATION` руу оруулах, эсвэл тэндээс гаргахыг 400-аар хориглоно. Буруу шилжилт бүр 400 буцаана.

### Endpoint-ууд

| Endpoint | Эрх | Тайлбар |
| --- | --- | --- |
| `GET /settings/bank-account` | нэвтэрсэн бүх хэрэглэгч | `{ bankName, accountNumber, accountName, updatedAt }`; `updatedAt: null` бол жишээ данс |
| `PUT /settings/bank-account` | ADMIN | Данс солих. Дугаарын зайг арилгана; 6–20 оронтой тоо эсвэл `MN` + 18 оронтой IBAN |
| `GET /settings/firm` | нийтийн (нэвтрэлтгүй) | `{ name, registrationNumber, phone, email, address, workingHours, updatedAt }`; хадгалаагүй бол жишээ, `registrationNumber: null` |
| `PUT /settings/firm` | ADMIN | Регистр 7 оронтой, утас 8 оронтой (зай, зураас, `+976` арилна), и-мэйл жижиг үсгээр |
| `POST /invoices/:id/mark-paid` | хэргийн CLIENT | `{ paymentNote? }` (≤500), `paymentMarkedAt` тавина |
| `POST /invoices/:id/confirm-payment` | ADMIN, багийн LAWYER | `PAID`, `paidAt`, `confirmedById` |
| `POST /invoices/:id/reject-payment` | ADMIN, багийн LAWYER | `{ reason }` заавал → `SENT` |
| `GET /invoices/payment-summary` | нэвтэрсэн бүх хэрэглэгч | Scope доторх баталгаажуулалт хүлээж буй төлбөр (sidebar badge) |

Бүх бичих хүсэлт `AuditLog`-д `invoices` entity-ээр, дансны өөрчлөлт `settings` entity-ээр бичигдэнэ.

### Event → мэдэгдэл

| Event | Хүлээн авагч | Мэдэгдлийн гарчиг |
| --- | --- | --- |
| `invoice.payment-marked` | ахлах LAWYER ба идэвхтэй бүх ADMIN | «Төлбөр хийгдсэн гэж тэмдэглэлээ, баталгаажуулна уу: {нэхэмжлэх №}» |
| `invoice.payment-confirmed` | CLIENT | «Төлбөр баталгаажлаа: {нэхэмжлэх №}» |
| `invoice.payment-rejected` | CLIENT | «Төлбөр баталгаажсангүй: {reason}» |

### UI

- **Портал** `/portal/invoices`, `/portal/invoices/[id]`: «Төлбөр төлөх» нь дансны мэдээлэл, төлөх дүн, гүйлгээний утгыг
  хуулах товчтой «Төлбөрийн заавар» modal нээнэ. «Төлбөр хийсэн» дарахад «Таны төлбөрийг хянаж байна» гарч, төлөх товч идэвхгүй болно.
  Татгалзсан бол шалтгаан улаанаар харагдаж, дахин тэмдэглэж болно. Dashboard-д «Төлбөр баталгаажуулж байна» карт тусдаа гарна.
- **Админ** `/admin/invoices`: «Баталгаажуулах хүлээгдэж буй» баннер, мөрийн тодотгол, төлөвийн шүүлт, sidebar-ын «Нэхэмжлэх» дээр тоо.
  `/admin/invoices/[id]`: харилцагчийн тэмдэглэл, тэмдэглэсэн цаг, «Төлбөр баталгаажуулах» болон «Татгалзах» (шалтгаан заавал).
  Ноорог нэхэмжлэх дээрх «Засах» нь дүн, тайлбар, төлөх хугацааг засна. Илгээсний дараа API 400 буцаадаг тул товч харагдахгүй.
- **Тохиргоо** `/admin/settings` (зөвхөн ADMIN; sidebar-ын «Тохиргоо», «Нэхэмжлэх» хуудасны «Төлбөрийн данс» товч): банк, дансны дугаар,
  хүлээн авагчийг засаж, харилцагчид хэрхэн харагдахыг шууд харуулна. Жишээ данс хэвээр байвал шар анхааруулга гарна.

### Дансны тохиргоо (ADMIN)

Данс `Setting` хүснэгтэд `bank-account` түлхүүрээр хадгалагдана. Мөр байхгүй бол API кодод байгаа **ЖИШЭЭ** дансыг
(Хаан банк · 5023118822 · «Law Firm» ХХН, `apps/api/src/settings/bank-account.ts`) `updatedAt: null`-тэй буцаана.

1. ADMIN-аар нэвтэрч `/admin/settings` → «Төлбөр хүлээн авах данс»-д бодит утгыг оруулаад «Хадгалах».
2. Build, restart хэрэггүй. Портал дараагийн ачааллаас шинэ дансыг харуулна, илгээсэн ч төлөгдөөгүй нэхэмжлэхүүд ч мөн адил.
3. DB-г гараар засаад хадгалсан утга schema-д таарахгүй болбол API жишээ данс руу буцахгүй, 500 буцаана. Ингэснээр
   харилцагч буруу дансанд мөнгө шилжүүлэхгүй. Тохиргоо хуудаснаас дахин хадгалахад засарна.
4. Seed-ийн `INV-YYYY-0002` дээрх «Хаан банкаар шилжүүлсэн» тэмдэглэл нь зөвхөн жишээ өгөгдөл.

### Фирмийн мэдээлэл (ADMIN)

`/admin/settings` → «Фирмийн мэдээлэл»: нэр, регистрийн дугаар, утас, и-мэйл, хаяг, ажлын цаг. `Setting` хүснэгтэд `firm`
түлхүүрээр хадгалагдана; хадгалаагүй үед өмнө нь сайтад хатуу бичигдсэн утгууд (регистргүй) харагдаж, шар анхааруулга гарна.

Хаана харагдах вэ:
- Нийтийн сайтын хөл, «Холбоо барих» хуудасны хаяг/утас/и-мэйл/ажлын цаг, нүүр хуудасны утасны товч, портал нэвтрэх
  хуудасны «Асуудал гарвал» утас (server-рендер, `firm-settings` tag-тай 60 секундын кэш, API унтарвал жишээ утгаар рендерлэнэ).
- Порталын алдааны хуудас, нууц үг сэргээх тэмдэглэл (client, `GET /settings/firm`).
- Портал болон админы нэхэмжлэхийн дэлгэрэнгүйд «Нэхэмжлэгч»: нэр, «РД …», утас.

Хадгалахад админ хуудас `POST /api/revalidate/firm` (web route) дуудна. Route нь cookie-гоор `/auth/me`-г шалгаж зөвхөн ADMIN-д
`revalidateTag('firm-settings')` хийдэг (бусад → 401/403) тул нийтийн сайт шууд шинэчлэгдэнэ. «Холбоо барих» хуудасны яаралтай утас,
`portal@` и-мэйл, бямба гарагийн цаг болон FAQ/үйлчилгээний текст доторх утсууд агуулгын хэсэг тул кодод хэвээр.

---

## 8. Хэргийн баг ба ажилтны даалгавар

Хэрэг бүр ажилтны багтай (`CaseMember`): нэг ахлах хуульч (`LEAD` «Ахлах») ба гишүүд (`MEMBER` «Гишүүн»).
`Case.lawyerId` нь үргэлж LEAD гишүүн байна. Migration нь одоо байгаа хэрэг бүрийн хариуцсан хуульчийг LEAD болгож нөхсөн.
Даалгавар (`Task`, `TaskComment`) нь зөвхөн ажилтны тал: CLIENT ямар ч даалгавар харахгүй, `/tasks` бүхэлдээ CLIENT-д 403.

### Эрхийн дүрэм

- **Хэрэгт хандах:** ADMIN, хэргийн багийн гишүүн LAWYER, хэргийн CLIENT. Өмнө нь «хариуцсан LAWYER» гэж шалгаж байсан бүх газар
  (хэрэг, үйл явдал, баримт, баримтын хүсэлт, мессеж, нэхэмжлэх, төлбөр, stats) одоо «багийн гишүүн» гэж шалгана.
- **Хэргийн мэдээлэл, төлөв, хаах, баг:** зөвхөн LEAD эсвэл ADMIN. Бусад гишүүдэд эдгээр нь зөвхөн харагдана.
- LEAD-ийг багаас хасах, шууд гишүүн болгох боломжгүй (400) — эхлээд өөр хуульчийг ахлах болгоно. Ахлахаар зөвхөн хуульч томилогдоно.
  ADMIN «Тойм»-оос хуульч солиход хуучин ахлах багаас хасагдана.
- Харилцагчийн мессеж, илгээсэн баримт, төлбөрийн тэмдэглэлийн мэдэгдэл ахлах хуульчид (`lawyerId`) очно.
- **Даалгавар харах:** ADMIN бүгдийг; LAWYER өөрт оноогдсон, өөрийн үүсгэсэн, эсвэл багийн гишүүн болсон хэргийн даалгаврыг.
- **Үүсгэх:** хэрэгт холбоотой бол үүсгэгч тухайн хэргийн багт байх ба гүйцэтгэгч нь багийн гишүүн байна (ADMIN аль ч идэвхтэй
  хуульч, админд оноож болно). Хэрэгт холбоогүй дотоод даалгаврыг LAWYER зөвхөн өөртөө үүсгэнэ.
- **Төлөв солих:** гүйцэтгэгч, үүсгэсэн хүн, ADMIN. **Засах** (гарчиг, тайлбар, хугацаа, ач холбогдол, гүйцэтгэгч) ба **устгах:**
  үүсгэсэн хүн эсвэл ADMIN. Даалгаврыг харах эрхтэй хүн бүр коммент бичнэ.

### Даалгаврын төлөв

| Одоогийн төлөв | Шилжих боломжтой |
| --- | --- |
| `TODO` «Хийх» | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` «Хийгдэж буй» | `TODO`, `REVIEW`, `CANCELLED` |
| `REVIEW` «Хянах» | `IN_PROGRESS`, `DONE`, `CANCELLED` |
| `DONE` «Дууссан» | `CANCELLED` |
| `CANCELLED` «Цуцалсан» | — |

`DONE` болоход `completedAt` тавигдана. Буруу шилжилт 400 буцаана. Ач холбогдол: `LOW` «Бага», `MEDIUM` «Дунд» (default),
`HIGH` «Өндөр», `URGENT` «Яаралтай». Хугацаа хэтэрсэн = идэвхтэй (`TODO`/`IN_PROGRESS`/`REVIEW`) ба `dueDate` өнгөрсөн.

### Endpoint-ууд

| Endpoint | Эрх | Тайлбар |
| --- | --- | --- |
| `GET /cases/:id/members` | ADMIN, багийн гишүүн | LEAD эхэндээ |
| `GET /cases/:id/members/candidates` | ADMIN, LEAD | Багт ороогүй идэвхтэй хуульч, админ |
| `POST /cases/:id/members` | ADMIN, LEAD | `{ userId, role? }` (`MEMBER` default). `LEAD` бол одоогийн ахлах гишүүн болж `lawyerId` шилжинэ. Давхар нэмэх → 409 |
| `PATCH /cases/:id/members/:userId` | ADMIN, LEAD | `{ role: 'LEAD' }` — ахлах шилжүүлэх. LEAD-ийг `MEMBER` болгох → 400 |
| `DELETE /cases/:id/members/:userId` | ADMIN, LEAD | 204. LEAD-ийг хасах → 400 |
| `GET /tasks` | ADMIN, LAWYER | `scope=mine`, `assigneeId`, `status`, `priority`, `caseId`, `overdue=true`, `sort=dueDate\|priority\|createdAt`, `page`, `limit` |
| `GET /tasks/my-summary` | ADMIN, LAWYER | `{ active, overdue, byStatus }` — надад оноогдсон идэвхтэй даалгавар |
| `GET /tasks/:id` | харах эрхтэй | Коммент болон `permissions { canEdit, canDelete, canChangeStatus }` |
| `POST /tasks` | ADMIN, LAWYER | `{ title, description?, caseId?, assigneeId, priority?, dueDate? }` |
| `PATCH /tasks/:id` | дээрх дүрмээр | `status` шилжилтийн дүрмээр шалгагдана |
| `DELETE /tasks/:id` | ADMIN, үүсгэсэн хүн | 204, коммент хамт устна |
| `POST /tasks/:id/comments` | харах эрхтэй | `{ body }` 1–2000 тэмдэгт |

Бүх бичих хүсэлт `AuditLog`-д `members` эсвэл `tasks` entity-ээр бичигдэнэ (коммент нь `tasks`).

### Event → мэдэгдэл

| Event | Хүлээн авагч | Мэдэгдлийн гарчиг |
| --- | --- | --- |
| `case.member-added` | нэмэгдсэн ажилтан (өөрийгөө нэмсэн бол үгүй) | «Танийг {хэргийн №} багт нэмлээ» → `/admin/cases/:id` |
| `task.assigned` | гүйцэтгэгч (өөртөө оноовол үгүй); гүйцэтгэгч солиход шинэ гүйцэтгэгч | «Танд даалгавар оноолоо: {гарчиг}» |
| `task.status-changed` | үүсгэсэн хүн ба гүйцэтгэгч, өөрчилсөн хүнээс бусад | «Даалгавар «{төлөв}» боллоо: {гарчиг}» |
| `task.commented` | гүйцэтгэгч ба үүсгэсэн хүн, бичсэн хүнээс бусад (давхардахгүй) | «Даалгаварт коммент: {гарчиг}» |

Даалгаврын мэдэгдлийн холбоос `/admin/tasks/:id`. Ажилтан эдгээрийг админ самбарын хонх болон `/admin/notifications`-оос харна (9-р хэсэг).

### UI

- **`/admin/tasks`**: «Жагсаалт» (хүснэгт, mobile дээр карт, мөрөнд дараагийн алхмын товч) ба «Самбар» (Хийх · Хийгдэж буй · Хянах ·
  Дууссан багана; чирэхгүй, картын товчоор шилжүүлнэ). Шүүлт: бүгд / надад оноогдсон, төлөв, ач холбогдол, хэрэг, эрэмбэ,
  «Зөвхөн хугацаа хэтэрсэн». Хугацаа хэтэрсэн даалгавар улаанаар тодорно.
- **Шинэ даалгавар modal**: LAWYER зөвхөн өөрийн багийн хэрэг, тухайн хэргийн багийн гишүүдийг сонгоно; хэрэг сонгоогүй бол гүйцэтгэгч нь өөрөө.
  ADMIN бүх идэвхтэй ажилтныг сонгоно.
- **`/admin/tasks/[id]`**: төлөв, ач холбогдол, хэрэг, гүйцэтгэгч, хугацаа; эрхээр харагдах төлөвийн товч, «Цуцлах», «Засах», «Устгах»; коммент.
- **`/admin/cases/[id]`** → «Баг»: гишүүдийн карт, «Ахлах» badge, «Гишүүн нэмэх», «Ахлах болгох», «Хасах» (LEAD, ADMIN).
  «Даалгавар»: хэргийн даалгавар, тэндээс үүсгэх.
- **Хянах самбар**: «Миний идэвхтэй даалгавар», «Хугацаа хэтэрсэн даалгавар» карт; sidebar-ын «Даалгавар» дээр идэвхтэй тоо.

---

## 9. Ажилтны мэдэгдэл (хонх ба мэдэгдлийн хуудас)

Өмнө нь баримтын хүсэлт, мессеж, төлбөр, даалгавар, хэргийн багийн event бүгд `Notification` үүсгэдэг байсан ч ажилтан
(ADMIN, LAWYER) тэдгээрийг харах газар байгаагүй. Одоо админ самбарын дээд буланд хонх, `/admin/notifications` хуудас нэмэгдсэн тул
**«ажилтны мэдэгдэл харагдахгүй» асуудал шийдэгдсэн**. Харилцагч портал дээр өмнөх шигээ харна.

### Эрх ба өгөгдөл

- `/notifications` route-ууд role-оор хязгаарлагдахгүй: CLIENT, LAWYER, ADMIN бүгд ашиглана, гэхдээ **зөвхөн өөрийн** мэдэгдлийг
  (`userId` = нэвтэрсэн хүн). Өөр хүний мэдэгдлийг уншсан болгох гэвэл 404 (id-г тааж шалгах боломжгүй).
- `actorId` — мэдэгдлийг үүсгэсэн үйлдлийг хийсэн хүн (даалгавар оноосон, мессеж бичсэн, төлбөр тэмдэглэсэн г.м.). Олон нийтийн
  өдөр тутмын сануулга зэрэг системийн мэдэгдэлд `null`. Хэрэглэгч устгагдвал `null` болно.
- Холбоос: ажилтанд очих мэдэгдэл `/admin/...`, харилцагчид очих нь `/portal/...` руу заана (бүх listener-ийг шалгасан).
  Админ хонх зөвхөн `/admin` холбоос руу, портал зөвхөн `/portal` холбоос руу шилжүүлнэ.

### Endpoint-ууд

| Endpoint | Тайлбар |
| --- | --- |
| `GET /notifications` | Шинэ нь эхэндээ. `filter=all\|unread\|read`, `cursor=<ачаалсан сүүлийн id>`, `limit` (1–50, default 50) → `{ items, unreadCount, nextCursor }`. Мөр бүр `actor { id, firstName, lastName, avatarUrl, role }`-тай |
| `GET /notifications/unread-count` | `{ count }` — хонхны badge |
| `PATCH /notifications/:id/read` | Нэг мэдэгдэл (өөр хүнийх → 404) |
| `PATCH /notifications/read-all` | Өөрийн бүх уншаагүйг → `{ updated }` |

### UI

- **Хонх** (админ болон портал header, desktop ба mobile — нэг `NotificationBell` компонент, `area` prop-оор `/admin` / `/portal` холбоос ялгана): уншаагүй тооны badge. Тоо 30 секунд тутам болон цонх руу буцаж ороход шинэчлэгдэнэ
  (WebSocket байхгүй). Дарахад сүүлийн 12 мэдэгдэл: уншаагүй нь тодорсон, хэн хийсэн, хэдийн өмнө. Мэдэгдэл дээр дарахад уншсан болж
  холбогдох хэрэг / даалгавар / нэхэмжлэх рүү шилжинэ. «Бүгдийг уншсан болгох», «Бүгдийг харах».
- **`/admin/notifications`**: Бүгд · Уншаагүй · Уншсан таб, өдрөөр бүлэглэсэн жагсаалт (порталын мэдэгдлийн мөрийн компонентыг
  дахин ашигласан, үйлдэл хийсэн хүний нэртэй), «Цааш үзэх» (cursor), хоосон төлөв, skeleton.

---

## 10. Гүйцэтгэл (ачаалал ба явц)

Даалгавар (`Task`) болон хэргийн баг (`CaseMember`) дээр суурилсан **удирдлагын хэрэгсэл**: ачааллыг тэнцвэржүүлэх, хэн завгүй
байгааг харах. Энэ нь хүнийг үнэлэх оноо биш — системд бүртгэгдээгүй ажил тоонд ордоггүй тул UI зөвхөн бодит тоо, төлөвийн
зураглал харуулж, дүгнэлт хийхгүй. Хугацаа хэтэрсэн тоо л улаан, бусад нь төвийг сахисан өнгөтэй.

### Харагдах хүрээ (scope)

- **ADMIN:** бүх идэвхтэй хуульч, админ.
- **LAWYER:** өөрөө + өөртэй нэг ч хэрэгт хамт `CaseMember` байгаа бүх хүн (багийн хамтрагчид).
- LAWYER хүрээнээс гадуурх (эсвэл байхгүй) хүний `/performance/user/:userId` эсвэл `timeline?userId=` → **403**.
  ADMIN идэвхтэй ажилтан биш хүн рүү → 404. CLIENT бүх `/performance/*` → 403.
- Дэлгэрэнгүй хуудасны «Сүүлийн даалгавар» нь харж буй хүний даалгавар харах эрхээр шүүгдэнэ (тоо бүх даалгаврыг тоолно).

### Тооцооллын тодорхойлолт

| Үзүүлэлт | Тодорхойлолт |
| --- | --- |
| Идэвхтэй | `status ∈ {TODO, IN_PROGRESS, REVIEW}`, гүйцэтгэгч нь тэр хүн. Одоогийн ачаалал тул хугацааны хүрээнээс хамаарахгүй |
| Дууссан | `status = DONE` ба `completedAt` сонгосон хүрээнд. `CANCELLED` хэзээ ч дууссанд орохгүй |
| Хугацаа хэтэрсэн | Идэвхтэй ба `dueDate < одоо` |
| Хугацаандаа биелүүлсэн % | (DONE ба `completedAt ≤ dueDate`) ÷ (DONE ба `dueDate`-тэй) × 100, бүхэл тоо руу бөөрөнхийлнө. `dueDate`-гүй даалгавар орохгүй; хуваарь 0 бол `null` («—») |
| Тоймын % | Хүрээний бүх хүний тоог нийлүүлж тооцно (хүн бүрийн хувийн дундаж биш) |
| Хэргийн тоо | Тухайн хүн гишүүн байгаа хэргийн тоо |

Хугацааны хүрээ (серверийн локал цаг): `this-month` — сарын 1-ээс одоог хүртэл; `last-30-days` — өнөөдөр ба өмнөх 29 хоног;
`all-time` — доод хязгааргүй. Timeline: `this-month`, `last-30-days` өдрөөр, `all-time` сараар (сүүлийн 24 сар хүртэл).
Дэлгэрэнгүйн төлөвийн задаргаанд идэвхтэй төлвүүд одоогийн байдлаар, DONE нь хүрээнд дууссан, CANCELLED нь хүрээнд
шинэчлэгдсэн даалгаврыг тоолно; ач холбогдлын задаргаа идэвхтэй даалгаврыг тоолно. Хүсэлт бүр хүний тооноос үл хамааран
5 `groupBy` query ашиглана (N+1 байхгүй).

### Endpoint-ууд

| Endpoint | Тайлбар |
| --- | --- |
| `GET /performance/overview?period=` | Хүрээний нэгдсэн тоо + `scope` (`organization` / `team`), хүний тоо |
| `GET /performance/by-user?period=` | Хүн бүрийн мөр: идэвхтэй, дууссан, хугацаа хэтэрсэн, хугацаандаа %, хэргийн тоо, `isSelf` |
| `GET /performance/user/:userId?period=` | Нэг хүн: үзүүлэлт, төлөв ба ач холбогдлын задаргаа, сүүлийн 8 даалгавар |
| `GET /performance/timeline?period=&userId=` | Дууссан даалгаврын бүлэглэл; `userId`-гүй бол харагдах хүрээ нэгдсэн |

`period`: `this-month` (default) · `last-30-days` · `all-time`; бусад утга → 400.

### UI

- **`/admin/performance`** (sidebar «Гүйцэтгэл»): «Энэ сар / Сүүлийн 30 хоног / Бүх цаг» таб (URL-д хадгалагдана), тоймын 4 карт,
  хөнгөн bar график (дэлгэц уншигчид хүснэгтээр), хүн бүрийн хүснэгт — багана дарж эрэмбэлнэ, мөр дарахад дэлгэрэнгүй, өөрийн мөр
  тодорно (mobile дээр карт). LAWYER-т «Миний болон багийн гүйцэтгэл».
- **`/admin/performance/[userId]`**: үзүүлэлт, төлөв/ач холбогдлын bar, хувийн график, сүүлийн даалгавар (Task рүү холбоос), 403 хуудас.
- **Хянах самбар (ADMIN):** «Багийн идэвхтэй даалгавар», «Энэ сард дууссан» карт → `/admin/performance`.

---

## 11. Өдөр тутмын сануулга (cron)

`RemindersModule` нь `@nestjs/schedule`-ээр `REMINDERS_CRON` (default өдөр бүр 08:00, серверийн локал цаг) ажиллана.
`NODE_ENV=test` эсвэл `REMINDERS_ENABLED=false` үед cron бүртгэгдэхгүй. ADMIN `POST /reminders/run`-аар одоо ажиллуулж,
`{ tasksOverdue, tasksDueSoon, invoicesMarkedOverdue, invoicesDueTomorrow, documentRequestsOverdue, notifications }` авна.

| Юу | Нөхцөл | Хэнд | Мэдэгдэл |
| --- | --- | --- | --- |
| Даалгавар хугацаа хэтэрсэн | TODO/IN_PROGRESS/REVIEW, `dueDate` < өнөөдрийн 00:00 | гүйцэтгэгч | «Хугацаа хэтэрсэн даалгавар: {гарчиг}» → `/admin/tasks/:id` |
| Даалгавар хугацаа дөхсөн | идэвхтэй, өнөөдөр эсвэл маргааш дуусна | гүйцэтгэгч | «Даалгаврын хугацаа дөхөж байна: {гарчиг}» |
| Нэхэмжлэх хугацаа хэтэрсэн | `SENT`, `dueDate` < өнөөдөр → **`OVERDUE` болгоно** | ахлах хуульч, харилцагч | «Нэхэмжлэхийн хугацаа хэтэрлээ: {№}» / «Нэхэмжлэхийн хугацаа хэтэрсэн» |
| Нэхэмжлэх маргааш дуусна | `SENT` | харилцагч | «Нэхэмжлэхийн төлөх хугацаа маргааш: {№}» |
| Баримтын хүсэлт хугацаа хэтэрсэн | `PENDING`/`REJECTED`, `dueDate` < өнөөдөр | харилцагч | «Баримт хүлээгдэж байна: {нэр}» → `?tab=requests` |

**Давхардлаас сэргийлэх арга:** `Task`, `Invoice`, `DocumentRequest` дээр `lastReminderAt` талбар. Ажил эхлэхдээ мөрүүдийг
`lastReminderAt = одоо` болгож «эзэлнэ» (зөвхөн өнөөдөр сануулаагүй мөрийг), дараа нь яг энэ `lastReminderAt`-тай мөрүүдэд л мэдэгдэл
үүсгэнэ. Иймд нэг зүйлд өдөрт нэгээс илүү сануулга очихгүй, нэг өдөр хоёр удаа ажиллуулахад дахин мэдэгдэл үүсэхгүй. Нэхэмжлэхийн
`SENT → OVERDUE` шилжилт статусаар хамгаалагдсан тул нэг л удаа болно. Notification-ийн link-ээр шалгах аргыг сонгоогүй:
баримтын хүсэлтийн link хэрэг рүү заадаг тул нэг хэрэг дээрх олон хүсэлтийг ялгаж чадахгүй. `AWAITING_CONFIRMATION`
(харилцагч төлбөрөө мэдэгдсэн) нэхэмжлэхэд хүрэхгүй.

## 12. Даалгаврын хавсралт ба Kanban чирэх

### Хавсралт

| Endpoint | Эрх | Тайлбар |
| --- | --- | --- |
| `POST /tasks/:id/attachments` | даалгаврыг харах эрхтэй (ADMIN, гүйцэтгэгч, үүсгэгч, хэргийн баг) | multipart `file` (+ `name`), PDF/Word/Excel/зураг/текст, 20MB. `tasks/<taskId>/` |
| `GET /tasks/:id/attachments` | мөн адил | шинэ нь эхэндээ |
| `GET /task-attachments/:id/download` | мөн адил | 5 минутын presigned URL |
| `DELETE /task-attachments/:id` | хавсаргасан хүн эсвэл ADMIN | Хадгалалтын объект бас устна |

CLIENT бүгдэд 403. DB бичилт амжилтгүй бол хадгалсан объектыг буцааж устгана; даалгавар устгахад хавсралтын объектууд цэвэрлэгдэнэ.
UI: `/admin/tasks/[id]` → «Хавсралт» карт (порталын drag-drop бүсийн загвар, `FileChip`, татах, устгах).

### Kanban чирэх

`/admin/tasks` → «Самбар»: карт бүрийн чирэх бариулаар (`@dnd-kit/core`, заагч эсвэл гар — Space, сум, Space) өөр багана руу зөөнө.
Чирэх үед зөвшөөрөгдсөн багана тодорч, зөвшөөрөгдөөгүй нь бүдэгрэнэ. Буулгахад эрх (гүйцэтгэгч, үүсгэгч, ADMIN) ба backend-ийн
шилжилтийн дүрмийг (`TODO ↔ IN_PROGRESS ↔ REVIEW → DONE`) шалгаад `PATCH /tasks/:id` явуулна: карт шууд шилжиж (optimistic),
API татгалзвал буцна. Картын төлөвийн товчнууд хэвээр (гараар ажиллах энгийн арга).

---

## 13. Үйлчилгээний хүсэлт (ServiceRequest)

Нийтийн «Холбоо барих» маягтыг нэвтэрсэн харилцагчийн хүсэлтээр сольсон. Харилцагч өмгөөлөгч авах эсвэл зөвлөгөө авах
хүсэлт гаргана → ADMIN хүлээж авах эсвэл шалтгаантай татгалзана → хүлээж авсан хүсэлтэд нэг өмгөөлөгч эсвэл баг
хуваарилахад хэрэг нээгдэж, харилцагч ба өмгөөлөгч тэр хэргээр харилцана.

### Төлөв

| Төлөв | Утга | Дараагийн төлөв |
| --- | --- | --- |
| `NEW` «Шинэ» | Харилцагч илгээсэн | `ACCEPTED`, `REJECTED` |
| `ACCEPTED` «Хүлээж авсан» | ADMIN хүлээж авсан, өмгөөлөгч хуваарилаагүй | `CONVERTED`, `REJECTED` |
| `REJECTED` «Татгалзсан» | Шалтгаан заавал (`rejectionReason`) | — |
| `CONVERTED` «Хэрэг нээгдсэн» | Хуваарилсан, `assignedCaseId` | — |

`ASSIGNED` гэсэн тусдаа төлөв байхгүй: хуваарилах үйлдэл хэрэг нээхтэй нэг transaction-д явагдаж шууд `CONVERTED` болно.
Эцсийн үр дүн хоёр л — татгалзах эсвэл хэрэг нээх. `NEW` хүсэлтийг шууд хуваарилах, давхар хуваарилах нь 400.
Шийдвэр бүр төлөвөөр хамгаалсан update-аар хийгдэх тул хоёр админ зэрэг шийдвэрлэж чадахгүй.

### Endpoint-ууд

| Endpoint | Эрх | Тайлбар |
| --- | --- | --- |
| `POST /service-requests` | CLIENT | `{ type: LAWYER\|CONSULTATION, caseType, title, description }` (тайлбар ≥30 тэмдэгт) → `NEW` |
| `GET /service-requests/mine` | CLIENT | Өөрийн хүсэлтүүд (шийдсэн админы нэр харагдахгүй) |
| `GET /service-requests` | ADMIN | `status`, `type`, `caseType` шүүлт, хуудаслалт, хүсэлт гаргагчийн мэдээлэлтэй |
| `GET /service-requests/summary` | ADMIN | `{ new, accepted }` — sidebar ба самбарын тоо |
| `GET /service-requests/:id` | ADMIN, өөрийн CLIENT | Бусад → 403 |
| `GET /service-requests/:id/suggested-lawyers` | ADMIN | `LawyerProfile.specializations` нь чиглэлтэй таарсан идэвхтэй өмгөөлөгчид (таарах хүн байхгүй бол бүгд), нээлттэй хэрэг цөөнөөс нь |
| `POST /service-requests/:id/accept` | ADMIN | `NEW → ACCEPTED` |
| `POST /service-requests/:id/reject` | ADMIN | `NEW/ACCEPTED → REJECTED`, `{ rejectionReason }` заавал |
| `POST /service-requests/:id/assign` | ADMIN | `ACCEPTED → CONVERTED`. `{ lawyerId }` эсвэл `{ leadId, memberIds[] }`. Хэрэг: дугаар автомат; гарчиг, тайлбар, төрөл хүсэлтээс; `clientId` = хүсэлт гаргагч; `lawyerId` = ганц өмгөөлөгч эсвэл ахлах. CaseMember: ахлах `LEAD`, бусад `MEMBER` |

LAWYER хүсэлтийг удирдахгүй (403): хуваарилагдсаны дараа тэр хэргээр л оролцоно (хэргийн scope). Бүх бичих хүсэлт
`AuditLog`-д `service-requests` entity-ээр бичигдэнэ. `ContactRequest` хүснэгтийн өгөгдлийг устгаагүй: `GET /contact` нь хуучин
маягтын мессежүүдийг ADMIN-д зөвхөн уншихаар үлдээсэн бөгөөд `/admin/requests` дээр эвхэгддэг хэсэгт харагдана.

### Event → мэдэгдэл

| Event | Хүлээн авагч | Гарчиг → холбоос |
| --- | --- | --- |
| `service-request.created` | идэвхтэй бүх ADMIN | «Шинэ үйлчилгээний хүсэлт: {гарчиг}» → `/admin/requests/:id` |
| `service-request.accepted` | хүсэлт гаргагч | «Таны хүсэлтийг хүлээж авлаа» → `/portal/requests` |
| `service-request.rejected` | хүсэлт гаргагч | «Таны хүсэлтийг татгалзлаа», биед шалтгаан → `/portal/requests` |
| `service-request.assigned` | ахлах ба гишүүн өмгөөлөгч; хүсэлт гаргагч | «Танд шинэ хэрэг хуваарилагдлаа: {дугаар}» → `/admin/cases/:id`; «Таны хүсэлтэд өмгөөлөгч томилогдлоо, хэрэг нээгдлээ» → `/portal/cases/:id` |

### UI

- **Нийтийн** `/contact`: «Өмгөөлөгч авах», «Зөвлөгөө авах» → `/portal/requests/new?type=…` (нэвтрээгүй бол нэвтрэх хуудас, дараа нь форм руу буцна).
- **Портал**: sidebar «Миний хүсэлт»; `/portal/requests` төлөв, татгалзсан шалтгаан, «Хэрэг рүү очих»; `/portal/requests/new` форм;
  нүүр хуудсанд шийдвэрлэгдэж буй хүсэлтийн карт; «Хэргүүд» хуудасны «Шинэ хүсэлт илгээх».
- **Админ**: sidebar «Хүсэлтүүд» (шинэ хүсэлтийн тоо), самбарын «Шинэ хүсэлт» тоо ба жагсаалт; `/admin/requests` шүүлт, шинэ мөр
  тодорсон; `/admin/requests/[id]` хүлээж авах / татгалзах, «Өмгөөлөгч хуваарилах» modal — нэг өмгөөлөгч эсвэл баг + ахлах,
  мэргэшил таарсан нь эхэнд.

### Тун удахгүй

- Хүсэлтэд баримт (гэрээ, мэдэгдэл) хавсаргах
- Харилцагч `NEW` хүсэлтээ өөрөө цуцлах
- 24 цагаас удаан `NEW` хэвээр байгаа хүсэлтийг өдөр тутмын сануулгад оруулах
- Хүсэлт дээр админы дотоод тэмдэглэл

---

## 14. Тест

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
татгалзаад дахин тэмдэглэх, CLIENT баталгаажуулах → 403, бүх шатны мэдэгдэл, PATCH хамгаалалт.
Хэргийн баг: гишүүн нэмэх/хасах/ахлах шилжүүлэх зөвхөн LEAD, ADMIN; LEAD хасах → 400; багийн бус хуульч → 403; гишүүн хэргийг нээх,
мэдэгдэл. Даалгавар: багийн бус хуульч үүсгэх → 403, багийн бус гүйцэтгэгч → 400, дотоод даалгаврыг зөвхөн өөртөө, CLIENT → 403,
буруу шилжилт → 400, `completedAt`, засах/устгах/төлөв солих эрх, коммент, my-summary, гурван event-ийн хүлээн авагч (өөрийгөө оруулахгүй).
Env (`THROTTLE_LIMIT` default ба шалгалт). Мэдэгдэл: зөвхөн өөрийн мэдэгдэл (өөр хүнийх → 404), filter/cursor, unread-count,
read/read-all, `actorId` хадгалах, бүх role-д ажиллах, query validation → 400. Гүйцэтгэл: ADMIN бүх ажилтан, LAWYER зөвхөн
багийн хамтрагч (бусад → 403, CLIENT → 403), period шүүлт, хугацаандаа % (dueDate-гүй орохгүй, хуваарь 0 → null), хугацаа хэтэрсэн,
CANCELLED дууссанд орохгүй, төлөв/ач холбогдлын задаргаа, сүүлийн даалгаврын эрх, timeline бүлэглэл, N+1 байхгүй.
Сануулга (DB-г санах ойд дуурайж job-ийг шууд дуудна): хугацаа хэтэрсэн/дөхсөн даалгаврын хүлээн авагч, нэхэмжлэх OVERDUE болох,
маргааш дуусах нэхэмжлэх, баримтын хүсэлт, нэг өдөр хоёр удаа ажиллуулахад давхардахгүй, хугацаа болоогүй зүйлд үүсэхгүй,
test/унтраасан үед cron бүртгэгдэхгүй. Хавсралт: upload/list/download/delete эрх, эрхгүй → 403, файл 400/413/415, даалгавар
устгахад объект цэвэрлэгдэх. Тохиргоо: жишээ данс (`updatedAt: null`), хадгалсан данс, эвдэрсэн утга → 500 (жишээ данс руу буцахгүй),
upsert-д ADMIN бичигдэх, GET бүх role-д, PUT зөвхөн ADMIN (LAWYER/CLIENT → 403), дугаарын зай арилах, MN IBAN, буруу утга → 400.
Фирмийн мэдээлэл: жишээ (регистргүй), хадгалсан, эвдэрсэн утга → 500, `firm` түлхүүрт upsert, GET нийтийн (`@Public`), PUT зөвхөн ADMIN,
утас/регистр/и-мэйл хэвийн болох, буруу утга → 400. Refresh: login бүр шинэ family, rotate хийхэд `rotatedAt` ба ижил family,
grace дотор зэрэг ирсэн хүсэлт бүх сесс хаахгүй, grace хэтэрсэн / сесс дууссан / `0` үед theft, env default 30.
Үйлчилгээний хүсэлт: CLIENT үүсгэх (created event), өөрийн жагсаалт, өөр хүнийх → 403, ADMIN шүүлт, accept/reject төлөвийн
хамгаалалт (400/404), нэг өмгөөлөгч ба багаар хуваарилахад Case + CaseMember, `NEW`/давхар/зэрэгцээ хуваарилалт → 400, идэвхгүй
өмгөөлөгч → 400, хэргийн дугаар давхцахад дахин оролдох, хуваарилсны дараах хэргийн scope, мэргэшлээр санал болгох, эрх
(CLIENT/LAWYER → 403) ба validation → 400, дөрвөн event-ийн мэдэгдэл. Хуучин contact: зөвхөн унших жагсаалт, PATCH → 404.
Нийт 460 тест, DB шаардахгүй (Prisma mock). Баг нэмэхээс өмнөх 249 тест хэвээр ногоон.

Хадгалалт (S3 клиентийг mock хийнэ): R2 тохиргоо (`region: 'auto'`, path-style), upload-ийн content type/length,
`public/` prefix ба bucket-гүй нийтийн URL, татах URL-ийн `Content-Disposition` болон хугацаа, устгах,
bucket байгаа эсэхийг шалгах, локалд bucket үүсгэх, production-д хэзээ ч үүсгэхгүй бөгөөд алдаанд унахгүй.

`packages/shared` дээр 10 тест: тестийн өгөгдлийн угтвар (`E2E `, `e2e.`), холболтын мөрөөс DB-ийн нэр
унших, `pnpm db:clean`-ий хамгаалалт (dev DB → алдаа, `--force` нь DB-ийн нэртэй яг таарах ёстой).
Нийт `pnpm test` → **470 тест**.

```bash
pnpm --filter @law-firm/web e2e     # Playwright, web :3001 + api :4000 ажиллаж байх ёстой
```

Playwright (42 тест): нийтийн сайт (2), портал (2), админ (4), баримтын хүсэлт (3), мессеж (3), төлбөр (3), даалгавар (3), мэдэгдэл (2), гүйцэтгэл (3), хонх/Kanban/хавсралт (3), сесс (4), тохиргоо/ноорог нэхэмжлэх (5), үйлчилгээний хүсэлт (4):
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
- ADMIN хоёр дахь хуульчийг багт нэмэх → тэр хуульч хэргийг нээх → ахлах хуульч даалгавар оноох → гүйцэтгэгч «Дууссан» болгох, мэдэгдэл.
- Багийн бус хуульч даалгавар болон хэргийн URL-аар 403, API 403; CLIENT `/tasks` → 403.
- LAWYER өөртөө дотоод даалгавар үүсгэж Kanban самбар дээр «Хийх»-ээс «Хийгдэж буй» руу шилжүүлэх, мэдэгдэл үүсэхгүй.
- LAWYER-т даалгавар оноогдоход хонхны тоо нэмэгдэх → хонхноос мэдэгдэл дарж даалгавар руу шилжих → уншсан болох.
- `/admin/notifications` дээр «Бүгдийг уншсан болгох» → уншаагүй таб хоосрох, мэдэгдлүүд уншсан болох.
- ADMIN `/admin/performance` дээр бүх идэвхтэй хуульчийг харах.
- LAWYER зөвхөн өөрийгөө ба багийн хамтрагчдаа харах; шинээр үүсгэсэн багийн бус хуульчийн дэлгэрэнгүй рүү URL-ээр орвол 403, API 403.
- Хугацааны таб солиход URL `period=` болж, тоймын тоо тухайн хүрээний API-н утгатай тэнцэх.
- Хуульч харилцагчид мессеж бичихэд порталын хонхны тоо нэмэгдэж, dropdown-оос мэдэгдэл харагдах, «Бүгдийг харах» → `/portal/notifications`.
- Kanban дээр даалгаврыг «Хийх»-ээс «Хийгдэж буй» руу чирэхэд API-д хадгалагдах (reload хийсэн ч), «Дууссан» руу шууд чирвэл татгалзаж буцах.
- Даалгаварт PDF хавсаргах → presigned татах → устгах; багийн бус хуульч татах гэвэл 403.
- `access_token` дууссан ч refresh хүчинтэй бол портал чимээгүй сэргэх; хүчингүй cookie үлдсэн бол цэвэрлэгдэж login гацалгүй гарах.
- ADMIN `/admin/settings` дээр хүлээн авагчийг солиход CLIENT-ийн «Төлбөрийн заавар»-т шинэ нэр гарах; буруу дансны дугаар хадгалагдахгүй (тест дараа нь буцаана).
- LAWYER-т «Тохиргоо» цэс харагдахгүй, хуудас 403, `PUT /settings/bank-account` 403.
- ADMIN ноорог нэхэмжлэхийн дүн, тайлбарыг «Засах»-аар өөрчлөх → илгээсний дараа «Засах» алга болох.
- Нэг refresh токеныг хоёр удаа илгээхэд хоёулаа 200, тухайн хэрэглэгчийн өөр сесс хаагдахгүй; хоёр табын access token зэрэг дуусахад хоёулаа порталд үлдэх.
- ADMIN фирмийн утсыг солиход (буруу регистр хадгалагдахгүй) нийтийн хөл, «Холбоо барих», нэвтрэх хуудас, CLIENT-ийн нэхэмжлэхийн «Нэхэмжлэгч» дээр шинэ утас гарах (тест дараа нь буцаана).
- `GET /settings/firm` нэвтрэлтгүй 200, LAWYER-ийн `PUT` 403, `POST /api/revalidate/firm` нэвтрээгүй 401, LAWYER 403.
- CLIENT `/contact`-оос «Өмгөөлөгч авах» → форм (богино тайлбар хадгалагдахгүй) → ADMIN жагсаалтаас нээж хүлээж авах → сонголтгүй
  хуваарилах боломжгүй → нэг өмгөөлөгч хуваарилж хэрэг нээх → CLIENT «Хэрэг рүү очих» → өмгөөлөгчийн мессеж порталд харагдах, мэдэгдэл.
- ADMIN шалтгаангүй татгалзах боломжгүй → шалтгаантай татгалзахад CLIENT талд шалтгаан ба мэдэгдэл; шийдсэн хүсэлтийг дахин хүлээж авах 400.
- Багаар хуваарилах: ахлахыг сольж хэрэг нээхэд ахлах LEAD, гишүүн MEMBER; хоёулаа хэрэгт хандаж, багийн бус хуульч 403.
- LAWYER хүсэлтийн API 403, CLIENT accept/assign 403, нэвтрээгүй POST 401; нэвтрээгүй зочин «Зөвлөгөө авах» → нэвтрээд
  төрөл сонгогдсон форм руу буцах; хуучин `/admin/contact` → `/admin/requests`, LAWYER-т цэс байхгүй, хуудас 403.

---

## 15. Production тэмдэглэл

- `pnpm build` → `apps/api/dist`, `apps/web/.next`. API: `node dist/main`, web: `next start`.
- API `trust proxy` = `TRUST_PROXY_HOPS` (зөвхөн production), cookie `secure` = true.
- Web ба API нэг үндсэн домэйны subdomain дээр байвал `COOKIE_DOMAIN=.lawfirm.mn` тохируулж болно.
- Migration: `pnpm db:deploy`.

### Railway (web + api хоёр service)

`*.up.railway.app` нь **public suffix** тул `web-xxx.up.railway.app` ба `api-xxx.up.railway.app` нь
өөр өөр сайт болно — `SameSite=Lax` cookie тэдний хооронд явахгүй, вэбийн `middleware.ts` ч API-ийн
cookie-г харахгүй. Тиймээс браузер API-г **зөвхөн вэбийн өөрийнх нь `/api/*`-аар** дуудна:

```
browser → https://web-xxx.up.railway.app/api/...   (next.config.ts rewrites)
              └→ http://api.railway.internal:4000/...   (Railway private network)
```

- `next.config.ts`-ийн `rewrites()` нь массив буцаадаг тул вэбийн өөрийн route-ууд түрүүлж ажиллана
  — `/api/revalidate` Next дээрээ үлдэж, бусад `/api/*` л API руу дамжина.
- Refresh cookie-ийн зам `COOKIE_PATH_PREFIX`-ээс хамаарна: шууд дуудахад `/auth`, proxy-гоор `/api/auth`.
- API нь `::` дээр сонсдог (Railway-ийн private network IPv6).

| Service | Build command | Start command |
| --- | --- | --- |
| api | `pnpm build:api` | `pnpm start:api` (`prisma migrate deploy` + `node dist/main`) |
| web | `pnpm build:web` | `pnpm start:web` (`next start --port $PORT`) |

Env (нарийн жагсаалт `.env.example`-ийн төгсгөлд):

- **api:** `NODE_ENV=production`, `DATABASE_URL`, `PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
  `CORS_ORIGIN=https://<web>.up.railway.app`, `COOKIE_PATH_PREFIX=/api`, `TRUST_PROXY_HOPS=2`,
  `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
- **web:** `NODE_ENV=production`, `NEXT_PUBLIC_API_URL=/api`, `API_URL=http://api.railway.internal:4000`.

`prisma migrate deploy` болон seed нь production-д ажиллах ёстой тул `prisma`, `tsx`, `dotenv`,
`argon2` нь `packages/shared`-ийн **dependencies** дотор байна (devDependencies-гүй суулгалтад ч ирнэ).
`prisma.config.ts` болон `seed.ts` нь `.env` файл байхгүй үед `process.env`-ээс уншина.

### Эхний админ (`pnpm db:admin`)

`pnpm start:api` нь зөвхөн `migrate deploy` хийдэг (seed ажиллуулдаггүй) тул шинэ deploy дээр
хэрэглэгч байхгүй. Эхний ADMIN-ыг CLI-ээр үүсгэнэ:

```bash
# Railway → Postgres service → Connect → DATABASE_PUBLIC_URL-ийг ашиглана
DATABASE_URL="postgresql://postgres:…@…proxy.rlwy.net:PORT/railway" \
  ADMIN_EMAIL=admin@lawfirm.mn ADMIN_PASSWORD='…' pnpm db:admin
```

- И-мэйл, нууц үг нь аппликейшны яг ижил zod дүрмээр шалгагдана (нууц үг ≥8 тэмдэгт, дор хаяж нэг
  үсэг, нэг тоо). Нууц үг argon2id-ээр hash хийгдэнэ, хэзээ ч хэвлэгддэггүй.
- Тухайн и-мэйлтэй хэрэглэгч аль хэдийн байвал өгөгдөл нь хэвээр үлдэж, идэвхтэй ADMIN болно —
  өөрөөр хэлбэл нууц үг сэргээхэд ч энэ командыг ашиглана.
- Аргументаар ч болно: `pnpm db:admin -- --email … --password … [--first … --last … --phone …]`.
- Нэвтрэх хаяг нь `/portal/login` (ажилтан `/admin` руу шилждэг); нэвтрэх нэр нь и-мэйл эсвэл утас.

**Rate limit:** `TRUST_PROXY_HOPS` буруу бол throttler бүх хэрэглэгчийг нэг IP гэж үзнэ. Шалгах:
`NODE_ENV=production` үед лог дээрх `req.ip` (эсвэл түр `/health`-д нэмж) бодит клиентийн IP байх
ёстой — Railway edge + вэбийн proxy = 2 hop.

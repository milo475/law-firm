/* eslint-disable no-console */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import argon2 from 'argon2';

loadEnv({ path: [path.resolve(__dirname, '../../../.env'), path.resolve(__dirname, '../.env')] });

import { getPrismaClient } from '../src/db';
import {
  CaseEventType,
  CaseStatus,
  CaseType,
  DocumentRequestStatus,
  InvoiceStatus,
  PostCategory,
  PostStatus,
  Role,
} from '../src/generated/prisma/enums';
import { formatCaseNumber } from '../src/utils/case-number';

const prisma = getPrismaClient();

const hash = (password: string) => argon2.hash(password, { type: argon2.argon2id });

const daysAgo = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const daysFromNow = (days: number, hour = 10) => daysAgo(-days, hour);

async function seedUsers() {
  const [adminHash, lawyerHash, clientHash] = await Promise.all([
    hash('Admin123!'),
    hash('Lawyer123!'),
    hash('Client123!'),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lawfirm.mn' },
    update: { passwordHash: adminHash, role: Role.ADMIN, isActive: true },
    create: {
      email: 'admin@lawfirm.mn',
      phone: '99110001',
      passwordHash: adminHash,
      firstName: 'Батболд',
      lastName: 'Дорж',
      role: Role.ADMIN,
    },
  });

  const lawyer1 = await prisma.user.upsert({
    where: { email: 'enkhjargal@lawfirm.mn' },
    update: { passwordHash: lawyerHash, role: Role.LAWYER, isActive: true },
    create: {
      email: 'enkhjargal@lawfirm.mn',
      phone: '99110002',
      passwordHash: lawyerHash,
      firstName: 'Энхжаргал',
      lastName: 'Баатар',
      role: Role.LAWYER,
      lawyerProfile: {
        create: {
          title: 'Ахлах хуульч, өмгөөлөгч',
          bio: 'Иргэний болон бизнесийн эрх зүйн чиглэлээр 12 жил ажилласан туршлагатай. Гэрээний маргаан, компанийн эрх зүй, хөрөнгө оруулалтын асуудлаар зөвлөгөө өгдөг.',
          specializations: ['Иргэний эрх зүй', 'Бизнесийн эрх зүй', 'Гэрээний маргаан'],
          education: 'МУИС, Хууль зүйн сургууль (2012), LL.M. — Nagoya University (2016)',
          yearsOfExperience: 12,
          isPublic: true,
          sortOrder: 1,
        },
      },
    },
  });

  const lawyer2 = await prisma.user.upsert({
    where: { email: 'oyunbileg@lawfirm.mn' },
    update: { passwordHash: lawyerHash, role: Role.LAWYER, isActive: true },
    create: {
      email: 'oyunbileg@lawfirm.mn',
      phone: '99110003',
      passwordHash: lawyerHash,
      firstName: 'Оюунбилэг',
      lastName: 'Цэрэн',
      role: Role.LAWYER,
      lawyerProfile: {
        create: {
          title: 'Хуульч, өмгөөлөгч',
          bio: 'Гэр бүл, хөдөлмөрийн болон эрүүгийн хэргийн чиглэлээр мэргэшсэн. Шүүхийн өмгөөлөл, хэлэлцээр, эвлэрүүлэн зуучлалын туршлагатай.',
          specializations: ['Гэр бүлийн эрх зүй', 'Хөдөлмөрийн эрх зүй', 'Эрүүгийн эрх зүй'],
          education: 'Отгонтэнгэр их сургууль, Хууль зүйн сургууль (2016)',
          yearsOfExperience: 8,
          isPublic: true,
          sortOrder: 2,
        },
      },
    },
  });

  const client1 = await prisma.user.upsert({
    where: { email: 'client1@example.mn' },
    update: { passwordHash: clientHash, role: Role.CLIENT, isActive: true },
    create: {
      email: 'client1@example.mn',
      phone: '88110001',
      passwordHash: clientHash,
      firstName: 'Ганбат',
      lastName: 'Сүх',
      role: Role.CLIENT,
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: 'client2@example.mn' },
    update: { passwordHash: clientHash, role: Role.CLIENT, isActive: true },
    create: {
      email: 'client2@example.mn',
      phone: '88110002',
      passwordHash: clientHash,
      firstName: 'Сарнай',
      lastName: 'Болд',
      role: Role.CLIENT,
    },
  });

  return { admin, lawyer1, lawyer2, client1, client2 };
}

async function seedPosts(authors: { admin: { id: string }; lawyer1: { id: string }; lawyer2: { id: string } }) {
  const posts = [
    {
      slug: 'shine-oflis-neelt',
      title: 'Манай хуулийн фирм шинэ оффистоо нүүлээ',
      excerpt: 'Сүхбаатар дүүрэг, Чингисийн өргөн чөлөөнд байрлах шинэ оффис маань үйлчлүүлэгчдээ хүлээн авч эхэллээ.',
      content: `## Шинэ оффис, шинэ боломж

Манай хамт олон 2026 оны 9-р сарын 1-ний өдрөөс эхлэн **Сүхбаатар дүүрэг, Чингисийн өргөн чөлөө** дэх шинэ оффистоо үйл ажиллагаагаа явуулж байна.

Шинэ байршил нь:

- Шүүхийн байгууллагуудтай ойр
- Үйлчлүүлэгчдэд зориулсан тусдаа уулзалтын өрөөтэй
- Зогсоолын хангалттай талбайтай

Та бидэнтэй урьдчилан цаг товлон уулзах боломжтой.`,
      category: PostCategory.NEWS,
      authorId: authors.admin.id,
      publishedAt: daysAgo(20),
      viewCount: 132,
    },
    {
      slug: 'undesnii-baga-hural-oroltsoo',
      title: 'Манай хуульчид хууль зүйн үндэсний бага хуралд оролцлоо',
      excerpt: 'Хуульчдын холбооноос зохион байгуулсан жил бүрийн бага хуралд манай хуульчид илтгэл тавьж оролцлоо.',
      content: `## Хууль зүйн үндэсний бага хурал 2026

Монголын Хуульчдын холбооноос жил бүр зохион байгуулдаг бага хуралд манай ахлах хуульч **Э. Баатар** "Гэрээний эрх зүй дэх дижитал гарын үсгийн хэрэглээ" сэдвээр илтгэл тавилаа.

Бага хурлын үеэр хөндөгдсөн гол сэдвүүд:

1. Цахим гэрээний хууль зүйн хүчин төгөлдөр байдал
2. Хувийн мэдээлэл хамгаалах хуулийн хэрэгжилт
3. Арбитрын шийдвэрийн гүйцэтгэл`,
      category: PostCategory.NEWS,
      authorId: authors.admin.id,
      publishedAt: daysAgo(12),
      viewCount: 87,
    },
    {
      slug: 'geree-baiguulahad-anhaarah-zuils',
      title: 'Гэрээ байгуулахад анхаарах 7 зүйл',
      excerpt: 'Аливаа гэрээнд гарын үсэг зурахаасаа өмнө заавал шалгах ёстой гол нөхцөлүүдийг хуульч зөвлөж байна.',
      content: `## Гэрээ байгуулахын өмнө

Гэрээ бол талуудын эрх, үүргийг тодорхойлдог хамгийн чухал баримт бичиг юм. Дараах зүйлсийг заавал анхаараарай:

1. **Талуудын мэдээлэл** — регистрийн дугаар, хаяг зөв эсэх
2. **Гэрээний зүйл** — юуг, хэзээ, хэрхэн гүйцэтгэх нь тодорхой эсэх
3. **Төлбөрийн нөхцөл** — дүн, хугацаа, хэлбэр
4. **Хариуцлага** — алданги, торгууль, хохирол нөхөн төлөх заалт
5. **Гэрээ цуцлах нөхцөл**
6. **Маргаан шийдвэрлэх журам** — шүүх эсвэл арбитр
7. **Хүчин төгөлдөр болох хугацаа**

> Эргэлзсэн тохиолдолд гарын үсэг зурахаасаа өмнө хуульчаас зөвлөгөө аваарай.`,
      category: PostCategory.ADVICE,
      authorId: authors.lawyer1.id,
      publishedAt: daysAgo(15),
      viewCount: 412,
    },
    {
      slug: 'hudulmuriin-gereeg-tsutslah',
      title: 'Хөдөлмөрийн гэрээг ажил олгогч цуцлах үед таны эрх',
      excerpt: 'Ажлаас халагдсан тохиолдолд ажилтан ямар эрхтэй, ямар хугацаанд гомдол гаргах боломжтой вэ?',
      content: `## Ажлаас халагдах үеийн эрх

Хөдөлмөрийн тухай хуулийн дагуу ажил олгогч хөдөлмөрийн гэрээг зөвхөн хуульд заасан үндэслэлээр цуцлах эрхтэй.

### Та дараах эрхтэй

- Цуцлах шийдвэрийг **бичгээр** авах
- Ажилласан хугацааны цалин, ашиглаагүй ээлжийн амралтын олговор авах
- Хуульд заасан тохиолдолд **тэтгэмж** авах
- Шийдвэрийг үндэслэлгүй гэж үзвэл **30 хоногийн дотор** хөдөлмөрийн маргаан таслах комисс эсвэл шүүхэд гомдол гаргах

Хугацаа алдахгүйн тулд шийдвэрийг хүлээн авмагцаа хуульчтай зөвлөлдөөрэй.`,
      category: PostCategory.ADVICE,
      authorId: authors.lawyer2.id,
      publishedAt: daysAgo(8),
      viewCount: 256,
    },
    {
      slug: 'irgenii-huuliin-nemelt-uurchlult-2026',
      title: 'Иргэний хуульд орсон 2026 оны нэмэлт өөрчлөлт',
      excerpt: 'Иргэний хуулийн гэрээний эрх зүйн хэсэгт орсон гол өөрчлөлтүүд, тэдгээрийн бизнест үзүүлэх нөлөө.',
      content: `## Юу өөрчлөгдсөн бэ?

2026 оны 7-р сарын 1-нээс хүчин төгөлдөр болсон Иргэний хуулийн нэмэлт өөрчлөлтөөр:

- Цахим хэлбэрээр байгуулсан гэрээг бичгийн хэлбэртэй **адилтган үзэх** заалт тодорхой болов
- Хэрэглэгчийн гэрээний **шударга бус нөхцөлийг** хүчин төгөлдөр бус гэж тооцох үндэслэл нэмэгдэв
- Хөөн хэлэлцэх хугацааны тоолол зарим тохиолдолд өөрчлөгдөв

### Бизнесүүдэд өгөх зөвлөмж

Стандарт гэрээний загваруудаа шинэчилж, хэрэглэгчтэй байгуулдаг нөхцөлүүдээ хуульчаар хянуулахыг зөвлөж байна.`,
      category: PostCategory.LEGAL_UPDATE,
      authorId: authors.lawyer1.id,
      publishedAt: daysAgo(5),
      viewCount: 198,
    },
    {
      slug: 'huviin-medeelel-hamgaalah-huuli',
      title: 'Хувь хүний мэдээлэл хамгаалах хууль: байгууллагын үүрэг',
      excerpt: 'Хувь хүний мэдээлэл хамгаалах тухай хуулийн дагуу байгууллагууд ямар үүрэг хүлээж, ямар хариуцлага тооцогдох вэ?',
      content: `## Байгууллагын гол үүргүүд

Хувь хүний мэдээлэл хамгаалах тухай хууль нь мэдээлэл цуглуулж, боловсруулж буй бүх байгууллагад дараах үүргийг хүлээлгэдэг:

1. Мэдээлэл цуглуулах **зорилгоо** тодорхой зарлах
2. Мэдээллийн эзнээс **зөвшөөрөл** авах
3. Мэдээллийг **аюулгүй хадгалах** техник, зохион байгуулалтын арга хэмжээ авах
4. Зөрчил гарсан тохиолдолд эрх бүхий байгууллага болон мэдээллийн эзэнд **мэдэгдэх**

Хуулийн хэрэгжилтэд бэлтгэхэд манай баг дотоод журам, нууцлалын бодлого боловсруулахад тусална.`,
      category: PostCategory.LEGAL_UPDATE,
      authorId: authors.admin.id,
      publishedAt: daysAgo(2),
      viewCount: 64,
    },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: { ...post, status: PostStatus.PUBLISHED },
      create: { ...post, status: PostStatus.PUBLISHED },
    });
  }

  // One draft so the manage listing has something unpublished.
  await prisma.post.upsert({
    where: { slug: 'noorog-niitlel' },
    update: {},
    create: {
      slug: 'noorog-niitlel',
      title: 'Ноорог нийтлэл — үл хөдлөх хөрөнгийн гэрээ',
      excerpt: 'Энэ нийтлэл одоогоор ноорог төлөвтэй бөгөөд олон нийтэд харагдахгүй.',
      content: 'Үл хөдлөх хөрөнгө худалдах, худалдан авах гэрээний нотариатын шаардлага, улсын бүртгэлийн журам...',
      category: PostCategory.ADVICE,
      status: PostStatus.DRAFT,
      authorId: authors.lawyer2.id,
    },
  });

  return posts.length;
}

async function seedCases(users: Awaited<ReturnType<typeof seedUsers>>) {
  const year = new Date().getFullYear();
  const definitions = [
    {
      caseNumber: formatCaseNumber(year, 1),
      title: 'Түрээсийн гэрээний маргаан — "Мөнх Тулга" ХХК',
      description: 'Оффисын байрны түрээсийн гэрээг хугацаанаас нь өмнө цуцалсантай холбоотой хохирол нэхэмжилж буй хэрэг.',
      type: CaseType.CIVIL,
      status: CaseStatus.IN_PROGRESS,
      clientId: users.client1.id,
      lawyerId: users.lawyer1.id,
      openedAt: daysAgo(45),
      events: [
        { type: CaseEventType.MEETING, title: 'Анхны уулзалт', description: 'Хэргийн нөхцөл байдалтай танилцаж, баримт бичгүүдийг хүлээн авав.', eventDate: daysAgo(45, 14), createdById: users.lawyer1.id, isVisibleToClient: true },
        { type: CaseEventType.DOCUMENT, title: 'Нэхэмжлэлийг шүүхэд өгөв', description: 'Сүхбаатар дүүргийн Иргэний хэргийн анхан шатны шүүхэд нэхэмжлэл гаргав.', eventDate: daysAgo(30, 11), createdById: users.lawyer1.id, isVisibleToClient: true },
        { type: CaseEventType.NOTE, title: 'Дотоод тэмдэглэл: стратеги', description: 'Эвлэрлийн саналыг эхлээд тавих, татгалзвал хохирлын тооцоог шинжээчээр тогтоолгох.', eventDate: daysAgo(28, 9), createdById: users.lawyer1.id, isVisibleToClient: false },
        { type: CaseEventType.HEARING, title: 'Шүүх хурал (урьдчилсан хэлэлцүүлэг)', description: 'Шүүхийн танхим №3, 10:00 цагт.', eventDate: daysFromNow(6, 10), createdById: users.lawyer1.id, isVisibleToClient: true },
        { type: CaseEventType.DEADLINE, title: 'Нэмэлт нотлох баримт гаргах хугацаа', description: null, eventDate: daysFromNow(3, 18), createdById: users.lawyer1.id, isVisibleToClient: true },
      ],
      documents: [
        { name: 'Түрээсийн гэрээ (2024).pdf', mimeType: 'application/pdf', size: 482_113, storageKey: `seed/${formatCaseNumber(year, 1)}/tureesiin-geree-2024.pdf`, uploadedById: users.client1.id, isVisibleToClient: true },
        { name: 'Нэхэмжлэлийн төсөл.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 96_210, storageKey: `seed/${formatCaseNumber(year, 1)}/nehemjleliin-tosol.docx`, uploadedById: users.lawyer1.id, isVisibleToClient: true },
        { name: 'Дотоод шинжилгээ.pdf', mimeType: 'application/pdf', size: 210_004, storageKey: `seed/${formatCaseNumber(year, 1)}/dotood-shinjilgee.pdf`, uploadedById: users.lawyer1.id, isVisibleToClient: false },
      ],
      invoices: [
        { invoiceNumber: `INV-${year}-0001`, amount: '1500000.00', description: 'Хэргийн урьдчилгаа — нэхэмжлэл бэлтгэх, шүүхэд төлөөлөх', status: InvoiceStatus.PAID, dueDate: daysAgo(20), paidAt: daysAgo(22) },
        { invoiceNumber: `INV-${year}-0002`, amount: '800000.00', description: 'Шүүх хуралд оролцох (1-р шат)', status: InvoiceStatus.AWAITING_CONFIRMATION, dueDate: daysFromNow(10), paidAt: null, paymentMarkedAt: daysAgo(1, 16), paymentNote: `Хаан банкаар 800 000₮ шилжүүлсэн, гүйлгээний утга: INV-${year}-0002` },
      ],
      // One approved, one rejected (client must resend) and one still pending.
      documentRequests: [
        {
          title: 'Иргэний үнэмлэхний хуулбар',
          description: 'Хоёр талын тод хуулбар (PDF эсвэл JPG).',
          isRequired: true,
          dueDate: daysAgo(38, 18),
          status: DocumentRequestStatus.APPROVED,
          requestedById: users.lawyer1.id,
          reviewedById: users.lawyer1.id,
          reviewedAt: daysAgo(40, 15),
          rejectionReason: null,
          createdAt: daysAgo(44),
          documents: [
            { name: 'Иргэний үнэмлэх.pdf', mimeType: 'application/pdf', size: 312_540, storageKey: `seed/${formatCaseNumber(year, 1)}/irgenii-unemleh.pdf`, uploadedById: users.client1.id, isVisibleToClient: true, createdAt: daysAgo(41) },
          ],
        },
        {
          title: 'Түрээсийн төлбөр төлсөн баримт',
          description: 'Сүүлийн 12 сарын төлбөрийн баримт эсвэл банкны хуулга.',
          isRequired: true,
          dueDate: daysAgo(2, 18),
          status: DocumentRequestStatus.REJECTED,
          requestedById: users.lawyer1.id,
          reviewedById: users.lawyer1.id,
          reviewedAt: daysAgo(4, 11),
          rejectionReason: 'Хуулга бүдэг, 3–6 дугаар сарын гүйлгээ дутуу байна. Бүтэн хуулгыг дахин илгээнэ үү.',
          createdAt: daysAgo(14),
          documents: [
            { name: 'Банкны хуулга.jpg', mimeType: 'image/jpeg', size: 845_221, storageKey: `seed/${formatCaseNumber(year, 1)}/bankny-hulga.jpg`, uploadedById: users.client1.id, isVisibleToClient: true, createdAt: daysAgo(6) },
          ],
        },
        {
          title: 'Түрээслүүлэгчтэй хийсэн захидал харилцаа',
          description: 'Гэрээ цуцлах тухай и-мэйл, албан бичгүүд.',
          isRequired: false,
          dueDate: daysFromNow(5, 18),
          status: DocumentRequestStatus.PENDING,
          requestedById: users.lawyer1.id,
          reviewedById: null,
          reviewedAt: null,
          rejectionReason: null,
          createdAt: daysAgo(3),
          documents: [],
        },
      ],
    },
    {
      caseNumber: formatCaseNumber(year, 2),
      title: 'Гэрлэлт цуцлуулах, хүүхдийн тэтгэмж тогтоолгох',
      description: 'Гэрлэлт цуцлуулах, хүүхдийн асрамж болон тэтгэмжийн хэмжээг тогтоолгох нэхэмжлэл.',
      type: CaseType.FAMILY,
      status: CaseStatus.WAITING,
      clientId: users.client2.id,
      lawyerId: users.lawyer2.id,
      openedAt: daysAgo(20),
      events: [
        { type: CaseEventType.MEETING, title: 'Зөвлөгөө өгөх уулзалт', description: 'Гэрлэлт цуцлуулах журам, шаардлагатай баримтын жагсаалтыг танилцуулав.', eventDate: daysAgo(20, 15), createdById: users.lawyer2.id, isVisibleToClient: true },
        { type: CaseEventType.STATUS_CHANGE, title: 'Хэрэг хүлээгдэж буй төлөвт шилжив', description: 'Нөгөө талын хариу тайлбарыг хүлээж байна.', eventDate: daysAgo(4, 12), createdById: users.lawyer2.id, isVisibleToClient: true },
        { type: CaseEventType.DEADLINE, title: 'Орлогын тодорхойлолт авчрах', description: 'Ажил олгогчоос сүүлийн 6 сарын орлогын тодорхойлолт.', eventDate: daysFromNow(2, 17), createdById: users.lawyer2.id, isVisibleToClient: true },
      ],
      documents: [
        { name: 'Гэрлэлтийн гэрчилгээ.jpg', mimeType: 'image/jpeg', size: 1_204_811, storageKey: `seed/${formatCaseNumber(year, 2)}/gerleltiin-gerchilgee.jpg`, uploadedById: users.client2.id, isVisibleToClient: true },
        { name: 'Нэхэмжлэл (гарын үсэгтэй).pdf', mimeType: 'application/pdf', size: 355_920, storageKey: `seed/${formatCaseNumber(year, 2)}/nehemjlel.pdf`, uploadedById: users.lawyer2.id, isVisibleToClient: true },
      ],
      invoices: [
        { invoiceNumber: `INV-${year}-0003`, amount: '600000.00', description: 'Гэр бүлийн хэргийн зөвлөгөө, нэхэмжлэл бэлтгэх', status: InvoiceStatus.OVERDUE, dueDate: daysAgo(3), paidAt: null },
      ],
    },
    {
      caseNumber: formatCaseNumber(year, 3),
      title: 'Хөдөлмөрийн гэрээ хууль бусаар цуцалсан',
      description: 'Ажил олгогч урьдчилан мэдэгдэлгүйгээр хөдөлмөрийн гэрээг цуцалсан тул ажилд эгүүлэн тогтоолгох, цалин нэхэмжлэх.',
      type: CaseType.LABOR,
      status: CaseStatus.CLOSED,
      clientId: users.client1.id,
      lawyerId: users.lawyer2.id,
      openedAt: daysAgo(120),
      closedAt: daysAgo(10),
      events: [
        { type: CaseEventType.MEETING, title: 'Анхны уулзалт', description: null, eventDate: daysAgo(120, 11), createdById: users.lawyer2.id, isVisibleToClient: true },
        { type: CaseEventType.HEARING, title: 'Хөдөлмөрийн маргаан таслах комиссын хурал', description: 'Комисс ажилтны талд шийдвэрлэв.', eventDate: daysAgo(40, 14), createdById: users.lawyer2.id, isVisibleToClient: true },
        { type: CaseEventType.STATUS_CHANGE, title: 'Хэрэг хаагдав', description: 'Ажил олгогч 3 сарын цалинтай тэнцэх олговрыг төлж, талууд эвлэрэв.', eventDate: daysAgo(10, 16), createdById: users.lawyer2.id, isVisibleToClient: true },
      ],
      documents: [
        { name: 'Хөдөлмөрийн гэрээ.pdf', mimeType: 'application/pdf', size: 288_400, storageKey: `seed/${formatCaseNumber(year, 3)}/hudulmuriin-geree.pdf`, uploadedById: users.client1.id, isVisibleToClient: true },
        { name: 'Эвлэрлийн гэрээ.pdf', mimeType: 'application/pdf', size: 190_112, storageKey: `seed/${formatCaseNumber(year, 3)}/evlerliin-geree.pdf`, uploadedById: users.lawyer2.id, isVisibleToClient: true },
      ],
      invoices: [
        { invoiceNumber: `INV-${year}-0004`, amount: '450000.00', description: 'Хөдөлмөрийн маргаан — төлөөлөл, эвлэрлийн гэрээ', status: InvoiceStatus.PAID, dueDate: daysAgo(15), paidAt: daysAgo(12) },
      ],
    },
  ];

  for (const def of definitions) {
    const { events, documents, invoices, documentRequests = [], ...data } = def;
    const record = await prisma.case.upsert({
      where: { caseNumber: data.caseNumber },
      update: data,
      create: data,
    });

    // Child rows have no natural key; rebuild them so the seed stays idempotent.
    await prisma.caseEvent.deleteMany({ where: { caseId: record.id } });
    await prisma.document.deleteMany({ where: { caseId: record.id } });
    await prisma.documentRequest.deleteMany({ where: { caseId: record.id } });
    await prisma.caseEvent.createMany({ data: events.map((event) => ({ ...event, caseId: record.id })) });
    await prisma.document.createMany({ data: documents.map((doc) => ({ ...doc, caseId: record.id })) });
    for (const { documents: attached, ...request } of documentRequests) {
      const created = await prisma.documentRequest.create({ data: { ...request, caseId: record.id } });
      if (attached.length > 0) {
        await prisma.document.createMany({ data: attached.map((doc) => ({ ...doc, caseId: record.id, requestId: created.id })) });
      }
    }

    for (const invoice of invoices) {
      await prisma.invoice.upsert({
        where: { invoiceNumber: invoice.invoiceNumber },
        update: { ...invoice, caseId: record.id },
        create: { ...invoice, caseId: record.id },
      });
    }
  }

  return definitions.length;
}

/** A short client ↔ lawyer thread on the first case; the lawyer's last message is still unread. */
async function seedMessages(users: Awaited<ReturnType<typeof seedUsers>>) {
  const caseRecord = await prisma.case.findUnique({ where: { caseNumber: formatCaseNumber(new Date().getFullYear(), 1) }, select: { id: true } });
  if (!caseRecord) return 0;
  await prisma.message.deleteMany({ where: { caseId: caseRecord.id } });
  const at = (days: number, hour: number, minute: number) => {
    const date = daysAgo(days, hour);
    date.setMinutes(minute);
    return date;
  };
  const client = users.client1.id;
  const lawyer = users.lawyer1.id;
  const messages = [
    { senderId: client, body: 'Сайн байна уу. Түрээслүүлэгч талаас эвлэрэх санал ирлээ. Хариу өгөхөөсөө өмнө тантай зөвлөмөөр байна.', createdAt: at(6, 10, 12), readAt: at(6, 10, 40) },
    { senderId: lawyer, body: 'Сайн байна уу. Саналын хуулбарыг «Баримт» хэсэгт хавсаргаарай. Үзээд маргааш хариу өгье.', createdAt: at(6, 14, 5), readAt: at(6, 15, 20) },
    { senderId: client, body: 'Хавсаргалаа. Хариу өгөх хугацаа нь энэ сарын 20-ны дотор гэж бичсэн байна.', createdAt: at(5, 9, 30), readAt: at(5, 10, 2) },
    { senderId: lawyer, body: 'Саналын нөхцөл манай шаардлагаас доогуур байна. Шүүх хурлын өмнө дахин уулзаж ярилцъя.', createdAt: at(4, 16, 45), readAt: at(4, 18, 10) },
    { senderId: lawyer, body: 'Урьдчилсан хэлэлцүүлэгт иргэний үнэмлэхээ авч, 15 минутын өмнө ирээрэй.', createdAt: at(1, 11, 5), readAt: null },
  ];
  await prisma.message.createMany({ data: messages.map((message) => ({ ...message, caseId: caseRecord.id })) });
  return messages.length;
}

async function seedNotifications(users: Awaited<ReturnType<typeof seedUsers>>) {
  await prisma.notification.deleteMany({ where: { userId: { in: [users.client1.id, users.client2.id] } } });
  await prisma.notification.createMany({
    data: [
      { userId: users.client1.id, type: 'CASE_EVENT', title: 'Шүүх хурлын товыг зарлалаа', body: 'LF хэргийн урьдчилсан хэлэлцүүлэг 6 хоногийн дараа болно.', link: '/portal/cases', isRead: false },
      { userId: users.client1.id, type: 'INVOICE', title: 'Шинэ нэхэмжлэх ирлээ', body: 'INV нэхэмжлэх (800,000₮) 10 хоногийн дотор төлөгдөх ёстой.', link: '/portal/invoices', isRead: false },
      { userId: users.client1.id, type: 'DOCUMENT', title: 'Шинэ баримт нэмэгдлээ', body: 'Нэхэмжлэлийн төсөл таны хэрэгт хавсаргагдлаа.', link: '/portal/documents', isRead: true },
      { userId: users.client2.id, type: 'INVOICE', title: 'Нэхэмжлэхийн хугацаа хэтэрлээ', body: 'INV нэхэмжлэх (600,000₮) төлөгдөөгүй байна.', link: '/portal/invoices', isRead: false },
    ],
  });
}

async function seedContactRequests() {
  const count = await prisma.contactRequest.count();
  if (count > 0) return;
  await prisma.contactRequest.createMany({
    data: [
      { name: 'Мөнхбат', phone: '99887766', email: 'munkhbat@example.mn', subject: 'Компани байгуулах зөвлөгөө', message: 'ХХК байгуулахад шаардлагатай баримт бичиг, хугацааны талаар зөвлөгөө авмаар байна.' },
      { name: 'Ариунаа', phone: '95123456', email: null, subject: 'Өв залгамжлал', message: 'Эцэг эхийн үл хөдлөх хөрөнгийг өвлөн авах журмын талаар асуух зүйл байна.' },
    ],
  });
}

async function main() {
  console.log('Seeding database…');
  const users = await seedUsers();
  console.log('  users: 1 admin, 2 lawyers, 2 clients');
  const posts = await seedPosts(users);
  console.log(`  posts: ${posts} published + 1 draft`);
  const cases = await seedCases(users);
  console.log(`  cases: ${cases} (with events, documents, invoices, document requests)`);
  const messages = await seedMessages(users);
  console.log(`  messages: ${messages} on the first case`);
  await seedNotifications(users);
  await seedContactRequests();
  console.log('Done.');
  console.log('\nLogin credentials:');
  console.log('  ADMIN   admin@lawfirm.mn        / Admin123!');
  console.log('  LAWYER  enkhjargal@lawfirm.mn   / Lawyer123!');
  console.log('  LAWYER  oyunbileg@lawfirm.mn    / Lawyer123!');
  console.log('  CLIENT  client1@example.mn      / Client123!');
  console.log('  CLIENT  client2@example.mn      / Client123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

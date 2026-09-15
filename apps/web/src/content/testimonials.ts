// Figma: 01 Public Site / Public / 01 Home / Desktop (15:19) — Testimonials (16:177)
export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  /** Two-letter monogram shown in the 40px avatar. */
  initials: string;
  role: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    quote: '«Ажлаас үндэслэлгүй халагдсан хэргээ 2 сарын дотор шийдвэрлүүлж, нөхөн олговроо бүрэн авсан. Явцын мэдээллийг тогтмол өгч байсанд талархаж байна.»',
    author: 'Э. Мөнхзул',
    initials: 'ЭМ',
    role: 'Харилцагч · Хөдөлмөрийн маргаан',
  },
  {
    id: 't2',
    quote: '«Компанийн хувьцаа эзэмшигчдийн гэрээг шинэчлэхэд мэргэжлийн зөвлөгөө өглөө. Эрсдэлийн дүгнэлт нь бидний хувьд маш үнэ цэнэтэй байв.»',
    author: 'Д. Ганзориг',
    initials: 'ДГ',
    role: '«Ирээдүй Групп» ХХК, захирал',
  },
  {
    id: 't3',
    quote: '«Гэр бүлийн хэрэгт хүнлэг, ойлгомжтой хандсан. Хүүхдийн эрх ашгийг нэн тэргүүнд тавьж ажилласанд баярлалаа.»',
    author: 'Б. Ариунаа',
    initials: 'БА',
    role: 'Харилцагч · Гэр бүлийн эрх зүй',
  },
];

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  label: string;
  image: string;
  color: string;
}

export const PROMOTIONS: Promotion[] = [
  {
    id: 'p1',
    title: 'Бизнес-ланч',
    subtitle: 'Суп + горячее + напиток всего за 490 ₽',
    label: 'Пн–Пт, 12:00–15:00',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
    color: '#1A1408',
  },
  {
    id: 'p2',
    title: 'Воскресный бранч',
    subtitle: 'Шведский стол из 20+ позиций',
    label: 'Вс, 11:00–14:00 · 890 ₽/чел',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
    color: '#0A1A14',
  },
  {
    id: 'p3',
    title: 'Романтический вечер',
    subtitle: 'Ужин при свечах + живая музыка',
    label: 'Пт–Сб от 19:00 · Резерв обязателен',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    color: '#1A0A0A',
  },
];

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  category: string;
  badge?: string;
}

export interface MenuCategory {
  id: string;
  label: string;
  emoji: string;
}

export const MENU_UPDATED_AT = '03.03.2026';

export const CATEGORIES: MenuCategory[] = [
  { id: 'breakfast', label: 'Завтраки', emoji: '🌅' },
  { id: 'hot', label: 'Горячее', emoji: '🔥' },
  { id: 'grill', label: 'Гриль', emoji: '🥩' },
  { id: 'desserts', label: 'Десерты', emoji: '🍮' },
  { id: 'drinks', label: 'Напитки', emoji: '☕' },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'b1',
    name: 'Яйца Бенедикт',
    description: 'Яйца пашот, ветчина, голландский соус на тостах',
    price: 490,
    image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=600&q=80',
    available: true,
    category: 'breakfast',
  },
  {
    id: 'b2',
    name: 'Авокадо-тост',
    description: 'Цельнозерновой хлеб, крем из авокадо, яйцо пашот, микрозелень',
    price: 420,
    image: 'https://images.unsplash.com/photo-1603046891744-76e6300f82ef?w=600&q=80',
    available: true,
    category: 'breakfast',
    badge: 'Хит',
  },
  {
    id: 'b3',
    name: 'Блинчики с рикоттой',
    description: 'Нежные блинчики с рикоттой, свежими ягодами и кленовым сиропом',
    price: 380,
    image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80',
    available: true,
    category: 'breakfast',
  },
  {
    id: 'b4',
    name: 'Омлет с трюфелем',
    description: 'Классический омлет с трюфельным маслом и пармезаном',
    price: 650,
    image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&q=80',
    available: false,
    category: 'breakfast',
  },
  {
    id: 'h1',
    name: 'Чахохбили из курицы',
    description: 'Грузинское рагу из курицы с томатами, луком и зеленью',
    price: 520,
    image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80',
    available: true,
    category: 'hot',
    badge: 'Хит',
  },
  {
    id: 'h2',
    name: 'Пенне Арабьята',
    description: 'Паста с острым томатным соусом, чесноком и базиликом',
    price: 440,
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80',
    available: true,
    category: 'hot',
  },
  {
    id: 'h3',
    name: 'Лосось на пару',
    description: 'Филе лосося с овощным рататуем и соусом из белого вина',
    price: 890,
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80',
    available: true,
    category: 'hot',
  },
  {
    id: 'h4',
    name: 'Ризотто с грибами',
    description: 'Кремовое ризотто с белыми грибами, трюфельным маслом и пармезаном',
    price: 680,
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80',
    available: true,
    category: 'hot',
  },
  {
    id: 'g1',
    name: 'Рибай 300г',
    description: 'Мраморная говядина, картофель гратен, соус демиглас',
    price: 1850,
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80',
    available: true,
    category: 'grill',
    badge: 'Премиум',
  },
  {
    id: 'g2',
    name: 'Ягнёнок на мангале',
    description: 'Каре ягнёнка с розмарином, гратеном из корнеплодов',
    price: 1650,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
    available: true,
    category: 'grill',
  },
  {
    id: 'g3',
    name: 'Куриное бедро гриль',
    description: 'Маринованное куриное бедро, овощи гриль, соус дзадзики',
    price: 520,
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=600&q=80',
    available: true,
    category: 'grill',
  },
  {
    id: 'g4',
    name: 'Лосось на углях',
    description: 'Стейк лосося на углях, спаржа, соус бер блан',
    price: 1100,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80',
    available: false,
    category: 'grill',
  },
  {
    id: 'd1',
    name: 'Тирамису',
    description: 'Классический тирамису с маскарпоне и кофейным сиропом',
    price: 320,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80',
    available: true,
    category: 'desserts',
    badge: 'Хит',
  },
  {
    id: 'd2',
    name: 'Брауни с мороженым',
    description: 'Тёплый шоколадный брауни, шарик ванильного мороженого',
    price: 280,
    image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&q=80',
    available: true,
    category: 'desserts',
  },
  {
    id: 'd3',
    name: 'Крем-брюле',
    description: 'Нежный ванильный крем с карамельной корочкой',
    price: 340,
    image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&q=80',
    available: true,
    category: 'desserts',
  },
  {
    id: 'dr1',
    name: 'Авторский кофе',
    description: 'Фирменный напиток бариста — сюрприз дня',
    price: 250,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
    available: true,
    category: 'drinks',
    badge: 'Новинка',
  },
  {
    id: 'dr2',
    name: 'Капучино',
    description: 'Двойной эспрессо, молочная пенка, корица по желанию',
    price: 180,
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80',
    available: true,
    category: 'drinks',
  },
  {
    id: 'dr3',
    name: 'Свежевыжатый сок',
    description: 'Апельсин, грейпфрут или яблоко на выбор',
    price: 220,
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80',
    available: true,
    category: 'drinks',
  },
  {
    id: 'dr4',
    name: 'Лимонад «Баракят»',
    description: 'Авторский лимонад с имбирём, мятой и лемонграссом',
    price: 290,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
    available: true,
    category: 'drinks',
  },
];

// Sample initial Pakistani grocery products for Bismillah General Store And Kiryana, Yazman
// Redesigned with zero network images and fast instant-rendering emojis.

export const initialProducts = [
  {
    id: "prod-1",
    name: "Super Kernel Basmati Rice",
    urduName: "سپر کرنل باسمتی چاول",
    category: "Grocery",
    price: 380,
    unit: "1 kg",
    stock: 45,
    emoji: "🍚",
    description: "Premium aged aromatic long-grain Basmati rice, ideal for daily cooking and Biryani."
  },
  {
    id: "prod-2",
    name: "Refined White Sugar (Cheeni)",
    urduName: "سفید چینی صاف ستھری",
    category: "Grocery",
    price: 155,
    unit: "1 kg",
    stock: 60,
    emoji: "🍬",
    description: "Clean, sweet crystallized white sugar for tea, desserts, and cooking."
  },
  {
    id: "prod-3",
    name: "Chakki Fresh Whole Wheat Flour (Atta)",
    urduName: "چکی تازہ گندم کا آٹا",
    category: "Grocery",
    price: 1350,
    unit: "10 kg",
    stock: 25,
    emoji: "🌾",
    description: "100% pure stone-ground chakki wheat atta for soft, wholesome rotis and parathas."
  },
  {
    id: "prod-4",
    name: "Dalda Pure Cooking Oil Pouch",
    urduName: "ڈالڈا پیور کوکنگ آئل",
    category: "Grocery",
    price: 540,
    unit: "1 Liter",
    stock: 30,
    emoji: "🍳",
    description: "Fortified with Vitamin A & D, heart-friendly pure refined cooking oil."
  },
  {
    id: "prod-5",
    name: "Dalda Banaspati Ghee",
    urduName: "ڈالڈا بناسپتی گھی",
    category: "Grocery",
    price: 520,
    unit: "1 kg Pouch",
    stock: 28,
    emoji: "🧈",
    description: "Rich aroma and traditional taste for authentic curries and sweets."
  },
  {
    id: "prod-6",
    name: "Tapal Danedar Black Tea",
    urduName: "ٹپال دانے دار چائے",
    category: "Beverages",
    price: 690,
    unit: "430g Box",
    stock: 20,
    emoji: "🫖",
    description: "Pakistan's favorite robust and aromatic black tea blend for strong doodh patti."
  },
  {
    id: "prod-7",
    name: "Olper's Full Cream Pure Milk",
    urduName: "اولپرز خالص دودھ",
    category: "Dairy",
    price: 290,
    unit: "1 Liter",
    stock: 35,
    emoji: "🥛",
    description: "UHT treated, homogenized pure dairy milk for family nutrition and tea."
  },
  {
    id: "prod-8",
    name: "Peek Freans Sooper Biscuits",
    urduName: "پیک فرینز سوپر بسکٹ",
    category: "Snacks",
    price: 120,
    unit: "Family Pack",
    stock: 50,
    emoji: "🍪",
    description: "Crispy egg and milk biscuit, the quintessential tea-time snack across Pakistan."
  },
  {
    id: "prod-9",
    name: "Hamdard Rooh Afza Syrup",
    urduName: "روح افزا شربتِ مشرق",
    category: "Beverages",
    price: 440,
    unit: "800ml Bottle",
    stock: 18,
    emoji: "🍷",
    description: "The refreshing herbal summer drink and milk cooler for Yazman heat."
  },
  {
    id: "prod-10",
    name: "Surf Excel Quick Wash Detergent",
    urduName: "سرف ایکسل واشنگ پاؤڈر",
    category: "Household",
    price: 620,
    unit: "1 kg Pack",
    stock: 15,
    emoji: "🧼",
    description: "Tough stain removal with vibrant fabric care and refreshing fragrance."
  },
  {
    id: "prod-11",
    name: "Lifebuoy Total 10 Germ Protection Soap",
    urduName: "لائف بوائے صابن",
    category: "Personal Care",
    price: 130,
    unit: "115g Bar",
    stock: 40,
    emoji: "🧼",
    description: "100% stronger germ protection bar soap for family hygiene."
  },
  {
    id: "prod-12",
    name: "Sunsilk Black Shine Shampoo",
    urduName: "سن سلک شیمپو",
    category: "Personal Care",
    price: 460,
    unit: "180ml Bottle",
    stock: 14,
    emoji: "🧴",
    description: "Enriched with Amla Pearl complex for healthy and shiny hair."
  },
  {
    id: "prod-13",
    name: "Vim Anti-Germ Dishwash Bar",
    urduName: "وم ڈش واش بار",
    category: "Household",
    price: 95,
    unit: "300g Bar",
    stock: 4, // Low stock demo
    emoji: "🧽",
    description: "Power of 100 lemons to degrease pots and utensils effectively."
  },
  {
    id: "prod-14",
    name: "Nestlé MilkPak Dairy Cream",
    urduName: "نسلے ملک پیک ڈیری کریم",
    category: "Dairy",
    price: 195,
    unit: "200ml",
    stock: 0, // Out of stock demo
    emoji: "🥛",
    description: "Rich and creamy dairy indulgence for desserts, fruit chaat, and breakfast."
  }
];

export const categoriesList = [
  { id: "All", label: "All Items", urdu: "سب اشیاء", icon: "🛒" },
  { id: "Grocery", label: "Grocery", urdu: "کریانہ و راشن", icon: "🌾" },
  { id: "Dairy", label: "Dairy", urdu: "دودھ و ڈیری", icon: "🥛" },
  { id: "Snacks", label: "Snacks", urdu: "سنیکس و بسکٹ", icon: "🍪" },
  { id: "Beverages", label: "Beverages", urdu: "مشروبات و چائے", icon: "🧃" },
  { id: "Household", label: "Household", urdu: "گھریلو سامان", icon: "🧹" },
  { id: "Personal Care", label: "Personal Care", urdu: "ذاتی دیکھ بھال", icon: "🧴" }
];

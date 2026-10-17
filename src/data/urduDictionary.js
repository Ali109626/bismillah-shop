// ============================================================
// urduDictionary.js
// English -> Urdu product-name dictionary for the shop admin panel.
// Used by the "Auto Urdu Name" feature: when the admin types an
// English product name, the Urdu field is filled automatically
// from this list. If a word is missing here, the app falls back
// to Google Translate, and the admin can always edit by hand.
// To add more items later, just add one line: "English": "اردو",
// ============================================================

const urduDictionary = {
  // ---- Flour, Rice, Sugar ----
  "Sugar": "چینی",
  "Brown Sugar": "براؤن شوگر",
  "Jaggery": "گڑ",
  "Rice": "چاول",
  "Basmati Rice": "باسمتی چاول",
  "Broken Rice": "ٹوٹا چاول",
  "Wheat Flour": "آٹا",
  "Fine Flour": "میدہ",
  "Semolina": "سوجی",
  "Gram Flour": "بیسن",
  "Corn Flour": "کارن فلور",
  "Rice Flour": "چاول کا آٹا",

  // ---- Oils & Ghee ----
  "Cooking Oil": "کوکنگ آئل",
  "Mustard Oil": "سرسوں کا تیل",
  "Ghee": "گھی",
  "Desi Ghee": "دیسی گھی",
  "Banaspati Ghee": "بناسپتی گھی",
  "Coconut Oil": "ناریل کا تیل",

  // ---- Spices ----
  "Salt": "نمک",
  "Black Salt": "کالا نمک",
  "Red Chili Powder": "لال مرچ پاؤڈر",
  "Green Chili": "ہری مرچ",
  "Turmeric Powder": "ہلدی",
  "Coriander Powder": "دھنیا پاؤڈر",
  "Cumin Seeds": "زیرہ",
  "Black Pepper": "کالی مرچ",
  "White Pepper": "سفید مرچ",
  "Green Cardamom": "سبز الائچی",
  "Black Cardamom": "بڑی الائچی",
  "Cloves": "لونگ",
  "Cinnamon": "دار چینی",
  "Bay Leaves": "تیز پات",
  "Fennel Seeds": "سونف",
  "Fenugreek Seeds": "میتھی دانہ",
  "Mustard Seeds": "سرسوں کے بیج",
  "Nigella Seeds": "کلونجی",
  "Carom Seeds": "اجوائن",
  "Poppy Seeds": "خشخاش",
  "Sesame Seeds": "تل",
  "Dried Fenugreek Leaves": "قصوری میتھی",
  "Garam Masala": "گرم مصالحہ",
  "Chaat Masala": "چاٹ مصالحہ",
  "Biryani Masala": "بریانی مصالحہ",
  "Chicken Masala": "چکن مصالحہ",
  "Meat Masala": "گوشت مصالحہ",
  "Curry Powder": "کری پاؤڈر",
  "Dried Mango Powder": "امچور",
  "Pomegranate Seeds": "انار دانہ",
  "Tamarind": "املی",
  "Vinegar": "سرکہ",

  // ---- Lentils & Pulses ----
  "Red Lentils": "مسور کی دال",
  "Yellow Lentils": "مونگ کی دال",
  "Split Chickpeas": "چنے کی دال",
  "Black Gram": "ماش کی دال",
  "White Chickpeas": "سفید چنے",
  "Black Chickpeas": "کالے چنے",
  "Red Kidney Beans": "لوبیا",
  "Green Peas": "مٹر",

  // ---- Dairy & Eggs ----
  "Fresh Milk": "تازہ دودھ",
  "Milk Powder": "خشک دودھ",
  "Yogurt": "دہی",
  "Butter": "مکھن",
  "Cheese": "پنیر",
  "Eggs": "انڈے",
  "Dairy Cream": "ملائی",
  "Condensed Milk": "گاڑھا دودھ",

  // ---- Tea & Beverages ----
  "Tea": "چائے کی پتی",
  "Green Tea": "سبز چائے",
  "Coffee": "کافی",
  "Cold Drink": "کولڈ ڈرنک",
  "Juice": "جوس",
  "Mineral Water": "منرل واٹر",
  "Sharbat": "شربت",
  "Energy Drink": "انرجی ڈرنک",

  // ---- Bakery & Snacks ----
  "Bread": "ڈبل روٹی",
  "Rusk": "رس",
  "Cake": "کیک",
  "Biscuits": "بسکٹ",
  "Cookies": "کوکیز",
  "Nimko": "نمکو",
  "Chips": "چپس",
  "Noodles": "نوڈلز",
  "Pasta": "پاستا",
  "Vermicelli": "سویاں",
  "Cornflakes": "کارن فلیکس",
  "Oats": "اوٹس",
  "Papad": "پاپڑ",
  "Roasted Chickpeas": "بھنے ہوئے چنے",
  "Peanuts": "مونگ پھلی",

  // ---- Dry Fruits ----
  "Dates": "کھجور",
  "Almonds": "بادام",
  "Pistachios": "پستہ",
  "Walnuts": "اخروٹ",
  "Cashews": "کاجو",
  "Raisins": "کشمش",

  // ---- Pickles & Sauces ----
  "Mango Pickle": "آم کا اچار",
  "Mixed Pickle": "مکس اچار",
  "Lemon Pickle": "لیموں کا اچار",
  "Ketchup": "کیچپ",
  "Mayonnaise": "مایونیز",
  "Soy Sauce": "سویا ساس",
  "Chili Sauce": "چلی ساس",

  // ---- Personal Care ----
  "Bath Soap": "نہانے کا صابن",
  "Laundry Soap": "کپڑے دھونے کا صابن",
  "Detergent Powder": "سرف",
  "Shampoo": "شیمپو",
  "Hair Oil": "بالوں کا تیل",
  "Toothpaste": "ٹوتھ پیسٹ",
  "Toothbrush": "ٹوتھ برش",
  "Face Wash": "فیس واش",
  "Skin Cream": "کریم",
  "Lotion": "لوشن",
  "Baby Powder": "بے بی پاؤڈر",
  "Baby Oil": "بے بی آئل",
  "Baby Soap": "بے بی صابن",
  "Diapers": "ڈائپر",
  "Sanitary Pads": "سینیٹری پیڈز",
  "Tissue Paper": "ٹشو پیپر",
  "Toilet Paper": "ٹوائلٹ پیپر",

  // ---- Household ----
  "Dishwash Bar": "برتن دھونے کی ٹکیا",
  "Dishwash Liquid": "برتن دھونے کا لیکوئڈ",
  "Phenyl": "فینائل",
  "Broom": "جھاڑو",
  "Bucket": "بالٹی",
  "Matchbox": "ماچس",
  "Candles": "موم بتی",
  "Batteries": "بیٹری",
  "Torch": "ٹارچ",
  "Mosquito Coil": "مچھر مار کوائل",
  "Mosquito Repellent Spray": "مچھر مار اسپرے",

  // ---- Misc ----
  "Honey": "شہد",
  "Jam": "جیم",
  "Custard Powder": "کسٹرڈ پاؤڈر",
  "Jelly": "جیلی",
};

// Case-insensitive lookup: toUrdu("sugar") -> "چینی"
// Returns "" when the word is not in the dictionary.
function toUrdu(englishName) {
  if (!englishName) return "";
  const clean = englishName.trim().toLowerCase();
  const key = Object.keys(urduDictionary).find(
    (k) => k.toLowerCase() === clean
  );
  return key ? urduDictionary[key] : "";
}

// Plain list of English names — handy for the suggestion dropdown.
const groceryItemNames = Object.keys(urduDictionary);

// In-memory cache for translations so repeated lookups are instantaneous
const translationCache = new Map();

/**
 * Translate English text to Urdu:
 * 1. Exact match in built-in dictionary
 * 2. In-memory translation cache
 * 3. Partial keyword / phrase match in dictionary (e.g. "Dalda Cooking Oil" -> "کوکنگ آئل")
 * 4. Free Google Translate endpoint fallback:
 *    https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=TEXT
 */
async function translateToUrdu(englishText) {
  const query = (englishText || "").trim();
  if (!query) return { urdu: "", source: "empty" };

  // 1. Direct dictionary match
  const directMatch = toUrdu(query);
  if (directMatch) {
    return { urdu: directMatch, source: "dictionary" };
  }

  // 2. Cache lookup
  const cacheKey = query.toLowerCase();
  if (translationCache.has(cacheKey)) {
    return { urdu: translationCache.get(cacheKey), source: "cache" };
  }

  // 3. Google Translate free endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && Array.isArray(data[0])) {
        const translated = data[0].map((item) => item[0]).filter(Boolean).join("").trim();
        if (translated) {
          translationCache.set(cacheKey, translated);
          return { urdu: translated, source: "google" };
        }
      }
    }
  } catch (err) {
    console.warn("Google translate fallback error:", err);
  }

  // 4. Substring dictionary search as local fallback
  const lowerQuery = query.toLowerCase();
  const sortedKeys = Object.keys(urduDictionary).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (lowerQuery.includes(k.toLowerCase())) {
      const partial = urduDictionary[k];
      translationCache.set(cacheKey, partial);
      return { urdu: partial, source: "dictionary-partial" };
    }
  }

  return { urdu: "", source: "none" };
}

/**
 * Filter suggestions from both:
 * (a) products already saved in the database
 * (b) built-in list of common grocery items
 */
function getProductNameSuggestions(query, existingProducts = [], limit = 8) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];

  const seen = new Set();
  const results = [];

  // Helper to add uniquely with scoring
  const addCandidate = (name, urdu, source) => {
    if (!name) return;
    const cleanName = name.trim();
    const key = cleanName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const startsWith = key.startsWith(q);
    const contains = key.includes(q);
    if (!contains) return;

    results.push({
      name: cleanName,
      urdu: urdu || toUrdu(cleanName) || "",
      source,
      priority: startsWith ? 0 : 1
    });
  };

  // (a) Products from database
  existingProducts.forEach((p) => {
    addCandidate(p.name, p.urduName, "Store Product");
  });

  // (b) Common grocery items from dictionary
  groceryItemNames.forEach((item) => {
    addCandidate(item, urduDictionary[item], "Common Grocery");
  });

  // Sort: prefix matches first, then shorter names
  results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.length - b.name.length;
  });

  return results.slice(0, limit);
}

export default urduDictionary;
export { toUrdu, groceryItemNames, translateToUrdu, getProductNameSuggestions };

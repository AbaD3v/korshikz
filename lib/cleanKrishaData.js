/**
 * Утилиты для очистки и нормализации данных, полученных с Krisha.kz
 */

const CITY_MAP = {
  "астана": "Астана", "астане": "Астана",
  "алматы": "Алматы", "алмате": "Алматы",
  "шымкент": "Шымкент", "шымкенте": "Шымкент",
  "караганда": "Караганда", "караганде": "Караганда",
  "атырау": "Атырау", "актау": "Актау",
  "актобе": "Актобе", "тараз": "Тараз",
  "павлодар": "Павлодар", "павлодаре": "Павлодар",
  "усть-каменогорск": "Усть-Каменогорск", "усть-каменогорске": "Усть-Каменогорск",
  "семей": "Семей", "костанай": "Костанай", "костанае": "Костанай",
  "кызылорда": "Кызылорда", "петропавловск": "Петропавловск", "петропавловске": "Петропавловск",
  "уральск": "Уральск", "талдыкорган": "Талдыкорган", "талдыкоргане": "Талдыкорган",
  "кокшетау": "Кокшетау", "туркестан": "Туркестан", "туркестане": "Туркестан"
};

export function extractCity(text) {
  if (!text) return "";
  const cityMatch = text.match(/(?:в|г\.)\s+([А-Яа-яЁёA-Za-z\s-]+)/i);
  const rawCity = cityMatch ? cityMatch[1].trim() : text.trim();
  const clean = rawCity.split(',')[0].trim().toLowerCase();
  return CITY_MAP[clean] || (rawCity.charAt(0).toUpperCase() + rawCity.slice(1));
}

export function extractAddress(title, rawAddress) {
  let source = rawAddress || title || "";
  let clean = source
    .replace(/Показать на карте/gi, "")
    .replace(/·/g, ",")
    .trim();

  clean = clean
    .replace(/\d+-комнатная квартира/gi, "")
    .replace(/[\d.,]+\s*(?:м²|м2|кв\.м)/gi, "")
    .trim();

  // убираем этажи вида "7/15 этаж," или "7 этаж,"
  clean = clean.replace(/^\s*\d+(?:\/\d+)?\s*этаж,?\s*/i, "").trim();

  clean = clean.replace(/^[,.\s-]+|[,.\s-]+$/g, "").trim();

  const parts = clean.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    const firstPart = parts[0].toLowerCase();
    const isCity = CITY_MAP[firstPart] || Object.values(CITY_MAP).some(v => v.toLowerCase() === firstPart);
    if (isCity) {
      return parts.slice(1).join(", ").trim();
    }
  }
  return clean || title;
}

export function extractRooms(text) {
  if (!text) return null;
  const match = text.match(/(\d+)-комнатная/i);
  return match ? parseInt(match[1]) : null;
}

export function extractArea(text) {
  if (!text) return null;
  const match = text.match(/([\d.,]+)\s*(?:м²|м2|кв\.м)/i);
  if (match) return parseFloat(match[1].replace(",", "."));
  return null;
}

export function parseFloorInfo(text) {
  if (!text) return { floor: null, totalFloors: null };
  const patterns = [
    /(\d+)\s*(?:\/|из)\s*(\d+)/i,
    /(\d+)\s*этаж(?:\s*из\s*(\d+))?/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        floor: parseInt(match[1]),
        totalFloors: match[2] ? parseInt(match[2]) : null
      };
    }
  }
  return { floor: null, totalFloors: null };
}

/**
 * Очистка и нормализация данных Krisha.kz
 */

export function cleanImages(urls) {
  if (!urls || !Array.isArray(urls)) return [];
  return Array.from(new Set(urls))
    .filter(url => typeof url === "string")
    // оставляем только большие фото в jpg
    .filter(url => url.includes("-750x470.jpg"))
    // убираем query string
    .map(url => url.split("?")[0]);
}

export function cleanDescription(text) {
  if (!text) return "";
  return text
    .replace(/«Крыша».*$/, "")
    .replace(/Больше объявлений.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePrice(rawPrice) {
  if (!rawPrice) return 0;
  let str = String(rawPrice).toLowerCase().replace(/\s+/g, "");
  if (str.includes("млн")) {
    return parseFloat(str.replace(/[^\d.,]/g, "").replace(",", ".")) * 1_000_000;
  }
  if (str.includes("тыс")) {
    return parseFloat(str.replace(/[^\d.,]/g, "").replace(",", ".")) * 1000;
  }
  return Number(str.replace(/\D/g, ""));
}

/**
 * Главная функция
 */
export function cleanKrishaData(raw) {
  const title = raw.title || "";
  const description = raw.description || "";

  const floorInfoFromDesc = parseFloorInfo(description);
  const floorInfoFromTitle = parseFloorInfo(title);

  const floor = floorInfoFromDesc.floor || floorInfoFromTitle.floor;
  const floors_total = floorInfoFromDesc.totalFloors || floorInfoFromTitle.totalFloors;

  const cleaned = {
    title: title.trim(),
    price: normalizePrice(raw.price),
    city: extractCity(raw.city || title),
    address: extractAddress(title, raw.address),
    description: cleanDescription(description),
    images: cleanImages(raw.images || []),
    rooms: extractRooms(title) || extractRooms(description),
    area_total: extractArea(title) || extractArea(description),
    floor,
    floors_total
  };

  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === null || cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });

  console.log("Cleaned images:", cleaned.images);

  return cleaned;
}

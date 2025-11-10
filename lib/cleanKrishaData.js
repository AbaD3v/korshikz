// Utility functions for cleaning Krisha.kz data
export function extractCity(text) {
  if (!text) return "";
  // First try to extract city from "в Городе" pattern
  const cityMatch = text.match(/в\s+([А-Яа-яЁёA-Za-z\s-]+)(?:\s*:|$)/);
  if (cityMatch) {
    // Convert "в Астане" to "Астана"
    return cityMatch[1].trim().replace(/е$/, "а");
  }
  
  // Fallback: try to clean up the old way
  const cleaned = text.replace(/Объявления[^,]+,?\s*/gi, "").trim();
  const parts = cleaned.split(",").map(part => part.trim());
  return parts[0] || "";
}

export function extractDistrict(text) {
  if (!text) return "";
  
  // Try to find district pattern like "Алматы р-н"
  const districtMatch = text.match(/([А-Яа-яЁёA-Za-z\s-]+\s*р-н)/);
  if (districtMatch) {
    return districtMatch[1].trim();
  }
  
  // Fallback: try to get district from comma-separated parts
  const parts = text.split(",").map(part => part.trim());
  for (const part of parts) {
    if (part.includes("р-н")) {
      return part.trim();
    }
  }
  
  return parts[1] || "";
}

export function extractAddress(title) {
  if (!title) return "";
  const parts = title.split(",");
  return parts[parts.length - 1].trim();
}

export function cleanDescription(text) {
  if (!text) return "";
  return text
    // Remove promotional text more carefully
    .replace(/«Крыша».*$/, "")
    .replace(/Больше объявлений.*$/, "")
    .replace(/^Объявление о продаже[^.]+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanImages(urls) {
  if (!urls || !Array.isArray(urls)) return [];
  const set = new Set();
  urls.forEach((url) => {
    if (typeof url === 'string' && !url.includes("-120x90")) {
      // Convert all images to .jpg and remove size suffixes
      const cleanUrl = url
        .split('?')[0]
        .replace(/-\d+x\d+(?=\.\w{3,4}$)/g, '')
        .replace(/\.webp$/i, '.jpg');
      set.add(cleanUrl);
    }
  });
  return Array.from(set);
}

// Extract numeric values safely
export function extractNumber(value) {
  if (!value) return 0;
  const str = String(value);
  const matches = str.match(/[\d\s,.]+/);
  if (!matches) return 0;
  // Handle both comma and space thousand separators
  return Number(matches[0].replace(/[,\s]/g, '').replace(/\.(\d+)$/, '.$1')) || 0;
}

// Parse house metadata from description
export function parseHouseMeta(text) {
  if (!text) return {};
  const meta = {};

  // House type
  const houseTypeMatch = text.match(/(?:дом|здание):\s*([\wа-яА-Я-]+)/i);
  if (houseTypeMatch) {
    meta.houseType = houseTypeMatch[1].toLowerCase().trim();
  }

  // Year built
  const yearMatch = text.match(/(?:год постройки|построен в):?\s*(\d{4})/i);
  if (yearMatch) {
    meta.year = Number(yearMatch[1]);
  }

  // Floor information
  const floorMatch = text.match(/(\d+)(?:\s*[-/]\s*|\s+из\s+)(\d+)\s*(?:этаж|эт\.?)/i);
  if (floorMatch) {
    meta.floor = Number(floorMatch[1]);
    meta.totalFloors = Number(floorMatch[2]);
  }

  return meta;
}

// Parse floor information from title or description
export function parseFloorInfo(text) {
  if (!text) return {};
  // Try different floor patterns
  const patterns = [
    /(\d+)\/(\d+)\s*этаж/i,
    /(\d+)\s*[-/]\s*(\d+)\s*эт/i,
    /(\d+)\s+из\s+(\d+)\s*эт/i,
    /этаж\s*:\s*(\d+)\s*\/\s*(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        floor: Number(match[1]),
        totalFloors: Number(match[2])
      };
    }
  }
  return {};
}

// Parse area from title or description
export function extractArea(text = "") {
  if (!text) return null;
  // Match various area formats: 107.1 м², 107,1м2, 107.1 m², etc.
  const match = text.match(/([\d.,]+)\s*[мm]\s*²?/i);
  return match ? parseFloat(match[1].replace(",", ".")) : null;
}

export async function getCoordinates(address, city) {
  const query = `${city}, ${address}`.trim();
  try {
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    if (data.coordinates) {
      return {
        latitude: data.coordinates[0],
        longitude: data.coordinates[1]
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
}

export function cleanKrishaData(raw) {
  // Basic text fields
  const title = raw.title || "";
  const city = extractCity(raw.city || "");
  const district = extractDistrict(raw.description || "");
  const address = extractAddress(title);
  const description = cleanDescription(raw.description || "");

  // Clean and normalize images (keeping WebP format)
  const images = cleanImages(raw.images || []);

  // Extract area from title or description
  const area = extractArea(title) || extractArea(description) || null;

  // Floor information from meta or parsing
  const floorInfo = parseFloorInfo(title) || parseFloorInfo(description);
  const floor = raw.meta?.floor || floorInfo.floor || null;
  const totalFloors = raw.meta?.totalFloors || floorInfo.totalFloors || null;

  // Clean up the final object
  const cleaned = {
    title,
    price: extractNumber(raw.price),
    city,
    district,
    address,
    description,
    images,
    area,
    floor,
    totalFloors,
    rooms: raw.meta?.rooms || null,
    coordinates: raw.coordinates || null,
  };

  // Remove undefined/null values for cleaner output
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || cleaned[key] === null) {
      delete cleaned[key];
    }
  });

  return cleaned;
}
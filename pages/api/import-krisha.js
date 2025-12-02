// pages/api/import-krisha.js
// Robust Krisha importer with address extraction

import * as cheerio from "cheerio";
import { URL } from "url";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

function absolutize(src, base) {
  try {
    return new URL(src, base).toString();
  } catch {
    return src;
  }
}

function extractNumberFromString(s) {
  if (!s) return "";
  const found = s.match(/[\d\s\u00A0,]+/);
  if (!found) return "";
  return found[0].replace(/\s|\u00A0|,/g, "");
}

// Fixed getCoordinates with absolute URL
async function getCoordinates(address, city) {
  const query = `${city}, ${address}`.trim();
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/geocode?address=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    if (data.coordinates) {
      return { latitude: data.coordinates[0], longitude: data.coordinates[1] };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Missing url in body" });

  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!parsed.hostname.includes("krisha.kz")) {
    return res.status(400).json({ error: `Only krisha.kz links are allowed.` });
  }

  try {
    const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!resp.ok) return res.status(502).json({ error: "Failed to fetch the page" });

    const html = await resp.text();
    const $ = cheerio.load(html);

    // --- JSON-LD scripts ---
    let jsonLd = null;
    $('script[type="application/ld+json"]').each((i, el) => {
      const txt = $(el).contents().text();
      if (!txt) return;
      try {
        const parsedJson = JSON.parse(txt);
        if (!jsonLd) jsonLd = parsedJson;
      } catch {}
    });

    let title = "";
    let description = "";
    let price = "";
    let city = "";
    let address = ""; // <<< NEW
    let images = [];
    let latitude = null;
    let longitude = null;
    const meta = {};

    if (jsonLd) {
      let jd = Array.isArray(jsonLd)
        ? jsonLd.find(o => o["@type"] && (String(o["@type"]).toLowerCase().includes("offer") || String(o["@type"]).toLowerCase().includes("product"))) || jsonLd[0]
        : jsonLd;
      try {
        if (!title && (jd.name || jd.title)) title = jd.name || jd.title;
        if (!description && jd.description) description = jd.description;
        if (!price && jd.price) price = String(jd.price);
        if (jd.image) {
          if (Array.isArray(jd.image)) images.push(...jd.image.map(i => String(i)));
          else images.push(String(jd.image));
        }
        if (jd.address && (jd.address.addressLocality || jd.address.region)) {
          city = jd.address.addressLocality || jd.address.region;
        }
        if (jd.geo && jd.geo.latitude) {
          latitude = jd.geo.latitude;
          longitude = jd.geo.longitude;
        }
      } catch {}
    }

    // --- Meta tags ---
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');

    if (!title && ogTitle) title = ogTitle.trim();
    if (!description && ogDesc) description = ogDesc.trim();
    if (ogImage) images.push(ogImage);

    // --- DOM fallback ---
    if (!title) {
      const h1 = $("h1").first().text().trim();
      if (h1) title = h1;
    }

    if (!description) {
      const descSelectors = [
        '[data-qa-type="ad-view-description"]',
        '.offer__description',
        '.description-text',
        '.text.text--gray',
        '.object-desc'
      ];
      for (const sel of descSelectors) {
        const t = $(sel).first().text().trim();
        if (t) {
          description = t;
          break;
        }
      }
    }

    // --- PRICE EXTRACTION ---
    if (!price) {
      const priceItem = $('[itemprop="price"]').attr("content") || $('[itemprop="price"]').text();
      if (priceItem) price = extractNumberFromString(priceItem);
    }
    if (!price) {
      const priceSelectors = [
        '[data-qa-type="ad-price"]',
        '.offer__price',
        '.price',
        '.object__price',
        '.price-value'
      ];
      for (const sel of priceSelectors) {
        const el = $(sel).first();
        if (el && el.length) {
          const text = el.text().trim();
          if (text) {
            const num = extractNumberFromString(text);
            if (num) {
              price = num;
              break;
            }
          }
        }
      }
    }
    if (!price) {
      const priceMatch = html.match(/"price"\s*:\s*"?(?<p>[\d\s,]+)"?/i) || html.match(/"price"\s*:\s*(?<p>\d+)/i);
      if (priceMatch?.groups?.p) price = priceMatch.groups.p.replace(/\s|,/g, "");
    }

    // --- CITY extraction ---
    if (!city) {
      const breadcrumbCandidates = ['.breadcrumbs a', '.crumbs a', '.breadcrumbs__link', '.offer__location a'];
      for (const sel of breadcrumbCandidates) {
        const elems = $(sel);
        if (elems?.length) {
          for (let i = 0; i < elems.length; i++) {
            const txt = $(elems[i]).text().trim();
            if (!txt) continue;
            const low = txt.toLowerCase();
            if (low.includes('показать') || low.includes('карте')) continue;
            city = txt;
          }
          if (city) break;
        }
      }
    }

    if (!city) {
      const addrSelectors = ['[data-qa-type="ad-address"]', '.offer__address', '.location', '.object-address'];
      for (const sel of addrSelectors) {
        const txt = $(sel).first().text().trim();
        if (txt) {
          const cleaned = txt.replace(/Показать на карте/gi, '').trim();
          if (cleaned) city = cleaned.split(',')[0].trim();
          if (city) break;
        }
      }
    }

    // --- ADDRESS extraction (FULL, WITH HOUSE NUMBER) ---
    const addressSelectors = [
      '[data-qa-type="ad-address"]',
      '.offer__address',
      '.object-address',
      '.location'
    ];

    for (const sel of addressSelectors) {
      const txt = $(sel).first().text().trim();
      if (txt) {
        address = txt.replace(/Показать на карте/gi, '').trim();
        break;
      }
    }

    // --- IMAGES extraction ---
    $('picture source').each((_, el) => {
      const srcset = $(el).attr('data-srcset') || $(el).attr('srcset');
      if (srcset) {
        const firstSrc = srcset.split(' ')[0];
        if (firstSrc?.startsWith('https')) images.push(firstSrc);
      }
    });

    $('img').each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src?.startsWith('https') && src.includes('photos.krisha.kz')) images.push(src);
    });

    // Puppeteer fallback
    if (!images?.length) {
      try {
        const executablePath = await chromium.executablePath();
        const browser = await puppeteer.launch({
          args: chromium.args,
          executablePath,
          headless: chromium.headless,
        });
        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        await page.waitForSelector('source, img', { timeout: 10000 }).catch(() => {});

        const dynamicImgs = await page.$$eval('source, img', (nodes) => {
          const out = [];
          nodes.forEach((node) => {
            try {
              if (node.tagName.toLowerCase() === 'source') {
                const ss = node.getAttribute('data-srcset') || node.getAttribute('srcset');
                if (ss) ss.split(',').forEach(s => { const u = s.trim().split(' ')[0]; if (u) out.push(u); });
              } else if (node.tagName.toLowerCase() === 'img') {
                const s = node.src || node.getAttribute('data-src') || node.getAttribute('data-lazy');
                if (s) out.push(s);
              }
            } catch {}
          });
          return out.filter(Boolean);
        });

        await browser.close();

        if (dynamicImgs?.length) {
          const dynClean = Array.from(new Set(dynamicImgs.map(u => absolutize(u, parsed.origin))))
            .map(u => u.replace(/-\d+x\d+(?=\.\w{3,4}$)/g, '').replace(/\.webp$/i, '.jpg'));
          images = Array.from(new Set([...images, ...dynClean]));
        }
      } catch (puppErr) {
        console.warn("Puppeteer fallback failed:", String(puppErr));
      }
    }

    if (price) price = String(price).replace(/\s|,/g, '');
    if (city) city = city.replace(/Показать на карте/gi, '').trim();

    return res.status(200).json({
      title,
      price,
      city,
      address,    // <<< NEW FIELD RETURNED
      description,
      images,
      latitude,
      longitude,
      meta
    });

  } catch (err) {
    console.error("import-krisha error:", err);
    return res.status(500).json({ error: "Internal server error", details: String(err) });
  }
}

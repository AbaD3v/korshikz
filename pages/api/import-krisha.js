import * as cheerio from "cheerio";
import { URL } from "url";
import puppeteer from "puppeteer";
import { cleanKrishaData } from "../../lib/cleanKrishaData";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

function absolutize(src, base) {
  try {
    return new URL(src, base).toString();
  } catch {
    return src;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Missing url in body" });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const html = await resp.text();
    const $ = cheerio.load(html);

    let title = "";
    let description = "";
    let price = "";
    let city = "";
    let address = "";
    let images = [];

    // 1. JSON-LD
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const txt = $(el).contents().text();
        if (!txt) return;
        const jd = JSON.parse(txt);
        const data = Array.isArray(jd) ? jd.find(o => o.name || o.description) : jd;
        if (data?.name && !title) title = data.name;
        if (data?.description && !description) description = data.description;
        if (data?.price && !price) price = String(data.price);
        if (data?.address && !city) {
          city = data.address.addressLocality || data.address.region;
        }
      } catch {}
    });

    // 2. Параметры
    let parametersText = "";
    $('.offer__parameters p, .offer__info-item, .offer__advert-short-info').each((i, el) => {
      parametersText += $(el).text().trim() + " ";
    });

    // 3. Адрес
    const addrBlock = $('.offer__location.offer__address, [data-qa-type="ad-address"]').first().text().trim();
    if (addrBlock) {
      const parts = addrBlock.replace(/Показать на карте/gi, '').split(',');
      if (!city) city = parts[0]?.trim();
      address = parts.slice(1).join(',').trim();
    }

    // 4. Хлебные крошки
    if (!city) {
      $('.breadcrumbs__item, .breadcrumbs a').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt.toLowerCase().includes('аренда') || txt.toLowerCase().includes('продажа')) return;
        city = txt;
      });
    }

    // 5. Fallbacks
    if (!price) price = $('.offer__price').first().text().trim();
    if (!title) title = $('h1').first().text().trim();
    if (!description) {
      description = $('.offer__description').text().trim() || $('[data-qa-type="ad-view-description"]').text().trim();
    }

    // 6. Фотографии (главный фикс — data-photo-url)
    $('img, source, [data-photo-url]').each((_, el) => {
      const srcset = $(el).attr('srcset');
      const dataSrc = $(el).attr('data-src');
      const photoUrl = $(el).attr('data-photo-url');
      const src = $(el).attr('src');
      const candidates = [];

      if (srcset) {
        srcset.split(',').forEach(s => {
          const url = s.trim().split(' ')[0];
          if (url) candidates.push(url);
        });
      }
      if (dataSrc) candidates.push(dataSrc);
      if (photoUrl) candidates.push(photoUrl);
      if (src && src.startsWith("https://photos.krisha.kz")) candidates.push(src);

      candidates.forEach(c => {
        if (c.includes('photos') || c.includes('kcdn.kz')) {
          const clean = c.split('?')[0]; // оставляем webp и размеры
          images.push(clean);
        }
      });
    });

// 7. Puppeteer fallback — перехватываем XHR с фото
if (images.length < 2) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    let allPhotos = [];

    // слушаем все ответы
    page.on("response", async (response) => {
      try {
        const url = response.url();
        if (url.includes("/photos")) {
          const data = await response.json();
          if (data?.photos && Array.isArray(data.photos)) {
            allPhotos.push(...data.photos);
          }
        }
      } catch (e) {
        // игнорируем ошибки парсинга
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // ждём немного, чтобы XHR успели отработать
    await page.waitForTimeout(3000);

    const filtered = allPhotos
      .filter(Boolean)
      .filter(src => src.includes("-750x470") && src.endsWith(".webp"))
      .map(src => src.split("?")[0]);

    images = [...new Set([...images, ...filtered])];
  } catch (e) {
    console.warn("Puppeteer failed:", e.message);
  } finally {
    if (browser) await browser.close();
  }
}



    // Финальная сборка
    const rawData = {
      title,
      price,
      city,
      address: address || addrBlock,
      description: (parametersText + " " + description).trim(),
      images: images.map(img => absolutize(img, parsed.origin))
    };

    console.log("Extracted images:", rawData.images);

    const cleanedData = cleanKrishaData(rawData);
    return res.status(200).json(cleanedData);

  } catch (err) {
    console.error("KRISHA_IMPORT_SERVER_ERROR:", err);
    return res.status(500).json({ error: "Ошибка сервера при импорте", details: err.message });
  }
}

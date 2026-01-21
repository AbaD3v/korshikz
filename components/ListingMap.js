"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ListingMap = ({ listings = [], onMarkerClick }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const router = useRouter();

  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  useEffect(() => {
    // Проверка, что скрипт Яндекса загружен и есть контейнер
    if (typeof window === "undefined" || !window.ymaps || !mapRef.current) return;

    window.ymaps.ready(() => {
      // Инициализация карты, если она еще не создана
      if (!mapInstance.current) {
        mapInstance.current = new window.ymaps.Map(mapRef.current, {
          center: [51.1605, 71.4704], // Астана
          zoom: 11,
          controls: ["zoomControl"],
        });
      }

      // Очищаем старые объекты перед добавлением новых
      try {
        mapInstance.current.geoObjects.removeAll();
      } catch (e) {
        console.error("Ошибка при очистке карты:", e);
      }

      // Создаем кластеризатор для группировки точек
      const clusterer = new window.ymaps.Clusterer({
        preset: "islands#invertedBlueClusterIcons",
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
      });

      // Вспомогательные функции для координат
      const normalizeCoords = (coords) => {
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const [a, b] = coords;
        // Исправляем инверсию, если координаты перепутаны местами
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
        return coords;
      };

      const getCoords = (l) => {
  // Вытаскиваем числа, даже если они пришли строками
  const lat = parseFloat(l.lat);
  const lng = parseFloat(l.lng);

  // Проверяем, что это реальные числа, а не NaN
  if (!isNaN(lat) && !isNaN(lng)) {
    // console.log(`Метка найдена: ${l.title} [${lat}, ${lng}]`);
    return [lat, lng];
  }

  // Запасной вариант для объектов geom или других структур
  if (Array.isArray(l.coordinates)) return [l.coordinates[1], l.coordinates[0]];
  
  console.warn("Объект без координат:", l);
  return null;
};

      // Создаем метки
      const placemarks = listings
        .map((l) => {
          const coords = getCoords(l);
          if (!coords) return null;

          const priceStr = l.price ? `${Number(l.price).toLocaleString("ru-RU")} ₸` : "";

          // Создаем саму метку
          const placemark = new window.ymaps.Placemark(
            coords,
            {
              balloonContent: `
                <div style="padding: 10px; min-width: 150px; font-family: sans-serif;">
                  <strong style="display: block; font-size: 14px; margin-bottom: 4px;">${l.title || "Объект"}</strong>
                  <div style="color: #6366f1; font-weight: 800; font-size: 16px;">${priceStr}</div>
                  <div style="margin-top: 8px; border-top: 1px solid #eee; pt: 8px;">
                     <a href="/listings/${l.id}" 
                        style="color: #6366f1; text-decoration: none; font-weight: bold; font-size: 12px; text-transform: uppercase;">
                        Смотреть детали →
                     </a>
                  </div>
                </div>
              `,
            },
            { 
              preset: "islands#redDotIcon",
              balloonPanelMaxMapArea: 0 // Балун будет открываться над меткой, а не панелью снизу
            }
          );

          // СОБЫТИЕ: Передаем клик родителю (теперь placemark определен!)
          placemark.events.add('click', () => {
            if (onMarkerClick) {
              onMarkerClick(l.id);
            }
          });

          return placemark;
        })
        .filter(Boolean);

      // Добавляем всё на карту
      if (placemarks.length > 0) {
        clusterer.add(placemarks);
        mapInstance.current.geoObjects.add(clusterer);

        // Автоматически масштабируем карту, чтобы все точки влезли
        const bounds = clusterer.getBounds();
        if (bounds) {
          mapInstance.current.setBounds(bounds, { 
            checkZoomRange: true, 
            zoomMargin: 30 
          });
        }
      }
    });

    // Cleanup при размонтировании
    return () => {
      if (mapInstance.current) {
        // Не уничтожаем, если просто меняются пропсы, 
        // но для полной очистки можно оставить destroy()
        // mapInstance.current.destroy(); 
      }
    };
  }, [listings, isMobileMapOpen, onMarkerClick]);

  return (
    <>
      {/* МОБИЛЬНАЯ ВЕРСИЯ */}
      <div className="lg:hidden w-full px-4">
        {!isMobileMapOpen ? (
          <button
            onClick={() => setIsMobileMapOpen(true)}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl mb-3 text-center font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
          >
            🗺️ Показать карту
          </button>
        ) : (
          <div className="relative mb-6">
            <div
              ref={mapRef}
              className="w-full h-[300px] rounded-[2rem] border-4 border-white shadow-2xl overflow-hidden"
            />
            <button
              onClick={() => setIsMobileMapOpen(false)}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-slate-900 p-2 rounded-xl shadow-md font-bold text-xs"
            >
              ЗАКРЫТЬ
            </button>
          </div>
        )}
      </div>

      {/* ДЕСКТОП ВЕРСИЯ */}
      <div className="hidden lg:block w-full h-full relative p-4">
        <div
          ref={mapRef}
          className="w-full h-full rounded-[2.5rem] shadow-2xl border-8 border-white dark:border-slate-900 overflow-hidden"
        />
      </div>
    </>
  );
};

export default ListingMap;
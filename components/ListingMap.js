"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const ListingMap = ({ listings }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const router = useRouter();

  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  const id = router.query.id || router.query.userId;

  useEffect(() => {
    if (!window.ymaps || !mapRef.current) return;

    window.ymaps.ready(() => {
      if (!mapInstance.current) {
        mapInstance.current = new window.ymaps.Map(mapRef.current, {
          center: [51.1605, 71.4704],
          zoom: 11,
          controls: ["zoomControl"],
        });
      }

      try {
        mapInstance.current.geoObjects.removeAll();
      } catch {}

      const clusterer = new window.ymaps.Clusterer({
        preset: "islands#invertedBlueClusterIcons",
        groupByCoordinates: false,
      });

      const normalizeCoords = (coords) => {
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const [a, b] = coords;
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
        return coords;
      };

      const getCoords = (l) => {
        if (Array.isArray(l.coordinates)) return normalizeCoords(l.coordinates);
        if (l.coordinates?.coordinates) return normalizeCoords(l.coordinates.coordinates);
        if (l.lat && l.lng) return [Number(l.lat), Number(l.lng)];
        return null;
      };

      const placemarks = listings
        .map((l) => {
          const coords = getCoords(l);
          if (!coords) return null;
          const priceStr = l.price ? `${Number(l.price).toLocaleString("ru-RU")} ₸` : "";
          return new window.ymaps.Placemark(
            coords,
            {
              balloonContent: `
                <div style="width: 180px">
                  <strong>${l.title || ""}</strong><br/>
                  ${priceStr}<br/>
                  <a href="/listings/${l.id}" target="_blank">Открыть</a>
                </div>
              `,
            },
            { preset: "islands#redDotIcon" }
          );
        })
        .filter(Boolean);

      if (placemarks.length) {
        clusterer.add(placemarks);
        mapInstance.current.geoObjects.add(clusterer);
        const bounds = clusterer.getBounds();
        if (bounds) mapInstance.current.setBounds(bounds, { checkZoomRange: true });
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, [listings, isMobileMapOpen]);

  return (
    <>
      {/* MOBILE MAP */}
      <div className="lg:hidden w-full">
        {!isMobileMapOpen && (
          <button
            onClick={() => setIsMobileMapOpen(true)}
            className="w-full bg-emerald-600 text-white py-2 rounded-xl mb-3 text-center font-medium"
          >
            Показать карту
          </button>
        )}

        {isMobileMapOpen && (
          <div className="relative">
            <div
              ref={mapRef}
              className="w-full h-[260px] rounded-xl border shadow-md"
            />

            <button
              onClick={() => setIsMobileMapOpen(false)}
              className="absolute top-2 right-2 bg-black/40 text-white px-3 py-1 rounded-lg text-sm"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>

      {/* DESKTOP MAP */}
      <div className="hidden lg:block w-full h-full">
        <div
          ref={mapRef}
          className="w-full h-full rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
        />
      </div>
    </>
  );
};

export default ListingMap;

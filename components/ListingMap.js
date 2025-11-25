"use client";
import React, { useEffect, useRef } from "react";

const ListingMap = ({ listings }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!window.ymaps || !mapRef.current) return;

    window.ymaps.ready(() => {
      mapInstance.current = new window.ymaps.Map(mapRef.current, {
        center: [51.1605, 71.4704], // Астана — дефолт
        zoom: 11,
        controls: ["zoomControl"],
      });

      const clusterer = new window.ymaps.Clusterer({
        preset: "islands#invertedBlueClusterIcons",
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterHideIconOnBalloonOpen: false,
      });

      const placemarks = listings
        .filter((l) => l.lat && l.lng) // Проверяем lat/lng вместо coordinates
        .map((l) => {
          const placemark = new window.ymaps.Placemark(
            [l.lat, l.lng], // Используем lat/lng
            {
              balloonContent: `
                <div style="width: 180px">
                  <strong>${l.title}</strong><br/>
                  ${l.price?.toLocaleString()} ₸<br/>
                  ${l.city || ""}
                  <br/>
                  <a href="/listings/${l.id}" target="_blank" class="text-blue-600 hover:underline">
                    Открыть объявление
                  </a>
                </div>
              `,
            },
            { preset: "islands#redDotIcon" }
          );
          return placemark;
        });

      clusterer.add(placemarks);
      mapInstance.current.geoObjects.add(clusterer);

      // Если есть метки, центрируем карту по ним
      if (placemarks.length > 0) {
        mapInstance.current.setBounds(clusterer.getBounds(), {
          checkZoomRange: true,
        });
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
    };
  }, [listings]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
    />
  );
};

export default ListingMap;
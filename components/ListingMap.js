"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";

const ListingMap = ({ listings }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const router = useRouter();
  const id = router.query.id || router.query.userId;

  useEffect(() => {
    console.log("Profile page: router.query =", router.query);
    console.log("Profile page: id =", id);
  }, [router.query]);

  useEffect(() => {
    if (!window.ymaps || !mapRef.current) return;

    window.ymaps.ready(() => {
      // инициализируем карту один раз
      if (!mapInstance.current) {
        mapInstance.current = new window.ymaps.Map(mapRef.current, {
          center: [51.1605, 71.4704], // Астана — дефолт
          zoom: 11,
          controls: ["zoomControl"],
        });
      }

      // очистим предыдущие объекты карты (если были)
      try {
        mapInstance.current.geoObjects.removeAll();
      } catch (e) {
        // noop
      }

      const clusterer = new window.ymaps.Clusterer({
        preset: "islands#invertedBlueClusterIcons",
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterHideIconOnBalloonOpen: false,
      });

      const normalizeCoords = (coords) => {
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const [a, b] = coords;
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
        return coords;
      };

      const getCoords = (l) => {
        if (Array.isArray(l.coordinates) && l.coordinates.length >= 2) {
          return normalizeCoords(l.coordinates);
        }
        if (l.coordinates && Array.isArray(l.coordinates.coordinates) && l.coordinates.coordinates.length >= 2) {
          return normalizeCoords(l.coordinates.coordinates);
        }
        if (l.lat != null && l.lng != null) return [Number(l.lat), Number(l.lng)];
        if (l.latitude != null && l.longitude != null) return [Number(l.latitude), Number(l.longitude)];
        return null;
      };

      const placemarks = listings
        .map((l) => {
          const coords = getCoords(l);
          console.debug(`Listing ${l.id} -> computed coords:`, coords);
          if (!coords) return null;
          const priceStr = l.price != null ? `${Number(l.price).toLocaleString("ru-RU")} ₸` : "";
          return new window.ymaps.Placemark(
            coords,
            {
              balloonContent: `
                <div style="width: 180px">
                  <strong>${l.title || ""}</strong><br/>
                  ${priceStr}<br/>
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
        })
        .filter(Boolean);

      console.debug("Placemark count:", placemarks.length);

      if (placemarks.length) {
        clusterer.add(placemarks);
        mapInstance.current.geoObjects.add(clusterer);
        const bounds = clusterer.getBounds();
        if (bounds) mapInstance.current.setBounds(bounds, { checkZoomRange: true });
      }
    });
    // end ready

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
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
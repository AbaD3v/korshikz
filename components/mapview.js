// mapview.js
"use client";
import React, { useEffect, useRef } from "react";

const MapView = ({ 
  address, 
  coordinates, 
  height = "300px",
  showCard = false 
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) return;

      mapInstance.current = new window.ymaps.Map(mapRef.current, {
        center: coordinates || [51.1694, 71.4491], // по умолчанию Астана
        zoom: 12,
        controls: ["zoomControl"],
      });

      const addMarker = (coords, markerAddress) => {
        mapInstance.current.geoObjects.add(
          new window.ymaps.Placemark(coords, {
            balloonContent: `<strong>${markerAddress || 'Расположение'}</strong>`,
          }, {
            preset: "islands#redDotIcon", // Красивый маркер с точкой
            iconColor: '#dc2626' // Красный цвет
          })
        );
      };

      if (address && !coordinates) {
        window.ymaps.geocode(address).then((res) => {
          const firstGeoObject = res.geoObjects.get(0);
          if (firstGeoObject) {
            const coords = firstGeoObject.geometry.getCoordinates();
            mapInstance.current.setCenter(coords);
            addMarker(coords, address);
          }
        });
      } else if (coordinates) {
        mapInstance.current.setCenter(coordinates);
        addMarker(coordinates, address);
      }
    };

    if (window.ymaps) {
      window.ymaps.ready(initMap);
    } else {
      const interval = setInterval(() => {
        if (window.ymaps) {
          clearInterval(interval);
          window.ymaps.ready(initMap);
        }
      }, 500);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
    };
  }, [address, coordinates]);

  const mapContent = (
    <>
      <div
        ref={mapRef}
        className="rounded-xl overflow-hidden shadow-sm"
        style={{ width: "100%", height }}
      />
      {address && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {address}
          </p>
          <a
            href={`https://yandex.kz/maps/?text=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            Открыть на карте
          </a>
        </div>
      )}
    </>
  );

  return showCard ? (
    <div className="mt-6 bg-white dark:bg-gray-800 shadow-md rounded-2xl p-4">
      <h3 className="text-lg font-semibold mb-3">📍 Расположение</h3>
      {mapContent}
    </div>
  ) : mapContent;
};

export default MapView;

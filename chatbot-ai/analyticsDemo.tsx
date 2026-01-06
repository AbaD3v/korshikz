import React, { useState, useEffect } from "react";
import { buildAnalyticsReport } from "../chatbot-ai/analytics";

export const AnalyticsDemo: React.FC = () => {
  const [report, setReport] = useState<ReturnType<typeof buildAnalyticsReport> | null>(null);

  useEffect(() => {
    // Вызываем только на клиенте
    setReport(buildAnalyticsReport());
  }, []);

  if (!report) {
    return <p>Загрузка отчёта...</p>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h2 className="text-lg font-bold mb-2">📊 Отчёт по телеметрии</h2>
      <p>Всего событий: {report.totalEvents}</p>
      <p>
        Fallback: {report.fallbackCount} (
        {(report.fallbackRate * 100).toFixed(1)}%)
      </p>

      <h3 className="mt-3 font-semibold">Топ интентов:</h3>
      <ul className="list-disc list-inside">
        {report.topIntents.map((i) => (
          <li key={i.intent}>
            {i.intent}: {i.count}
          </li>
        ))}
      </ul>

      <button
        className="mt-4 px-3 py-1 bg-indigo-600 text-white rounded"
        onClick={() => setReport(buildAnalyticsReport())}
      >
        🔄 Обновить отчёт
      </button>
    </div>
  );
};

// /chatbot-ui/pages/AnalyticsPage.tsx
import React from "react";
import { AnalyticsDemo } from "../analyticsDemo";

const AnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-6">
      <header className="mb-6 border-b pb-3">
        <h1 className="text-2xl font-bold text-indigo-700">
          📊 Аналитика Korshi Bot
        </h1>
        <p className="text-gray-600">
          Здесь отображается статистика использования чат-бота.
        </p>
      </header>

      <main>
        <AnalyticsDemo />
      </main>
    </div>
  );
};

export default AnalyticsPage;

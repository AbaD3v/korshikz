// components/TestBreakpoints.tsx
"use client";

export default function TestBreakpoints() {
  return (
    <div className="p-4 space-y-4">
      {/* Mobile only (<768px) */}
      <div className="md:hidden bg-red-400 text-black p-3 rounded">
        Я вижу бургер (mobile)
      </div>

      {/* Desktop only (>=768px) */}
      <div className="hidden md:block bg-green-400 text-black p-3 rounded">
        Я вижу полный хедер (desktop)
      </div>
    </div>
  );
}

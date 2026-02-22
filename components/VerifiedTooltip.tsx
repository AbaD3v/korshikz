import { motion } from "framer-motion";

export const VerifiedTooltip = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    whileHover={{ opacity: 1, y: 0, scale: 1 }} // Можно привязать к ховеру родителя
    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 pointer-events-none z-50"
  >
    <div className="bg-slate-900 dark:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap border border-white/10">
      {text}
      {/* Треугольник внизу */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900 dark:border-t-indigo-600" />
    </div>
  </motion.div>
);
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center py-4 px-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          korshi.kz
        </Link>
        <nav className="space-x-6 text-gray-700 font-medium">
          <Link href="/listings" className="hover:text-primary">Объявления</Link>
          <Link href="/create" className="hover:text-primary">Добавить</Link>
          <Link href="/about" className="hover:text-primary">О проекте</Link>
        </nav>
        <div className="space-x-3">
          <button className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition">
            Войти
          </button>
          <button className="border border-primary text-primary px-4 py-2 rounded-xl hover:bg-primary/10 transition">
            Регистрация
          </button>
        </div>
      </div>
    </header>
  );
}

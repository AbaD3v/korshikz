export default function Footer() {
  return (
    <footer className="bg-white border-t mt-12">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
        <p>© {new Date().getFullYear()} korshi.kz — Найди соседа по комнате</p>
        <div className="space-x-4 mt-2 md:mt-0">
          <a href="#" className="hover:text-primary">Контакты</a>
          <a href="#" className="hover:text-primary">Политика</a>
          <a href="#" className="hover:text-primary">Instagram</a>
        </div>
      </div>
    </footer>
  );
}

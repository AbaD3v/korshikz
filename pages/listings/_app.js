import "../styles/globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function App({ Component, pageProps }) {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-gray-800">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6">
        <Component {...pageProps} />
      </main>
      <Footer />
    </div>
  );
}

import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

export default function Document() {
  return (
    <Html>
      <Head>
        <Script
          src={`https://api-maps.yandex.ru/2.1/?apikey=d344e6d8-476c-40c8-a548-8506c1d2466c&lang=ru_RU`}
          strategy="beforeInteractive"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
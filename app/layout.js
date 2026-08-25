import "./globals.css";
import Link from "next/link";
import { STORE_NAME } from "@/lib/business";

export const metadata = {
  title: `${STORE_NAME} - 셀프정비소 예약`,
  description: "핸드폰으로 간단하게 예약하고 결제하는 셀프정비소, M.garage",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: STORE_NAME,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1447e6",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <div className="app-shell">
          <header className="app-header">
            <Link href="/" className="brand">
              <span className="brand-badge">M</span>
              {STORE_NAME}
            </Link>
            <Link href="/my-reservations" className="nav-link">
              내 예약 조회
            </Link>
          </header>
          <main className="app-main">{children}</main>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

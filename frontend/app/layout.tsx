import ThemeRegistry from "../components/ThemeRegistry";
import PWA from "../components/PWA";
import { AuthProvider } from "../contexts/AuthContext";
import type { ReactNode } from "react";

export const metadata = {
  title: "Smart Stempling",
  manifest: "/manifest.webmanifest",
  icons: {
    // Primary
    icon: [
      { url: "/branding/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/branding/favicon/favicon.ico", type: "image/x-icon" },
      { url: "/icons/icon.svg", type: "image/svg+xml" }, // fallback
    ],
    apple: [
      { url: "/branding/favicon/apple-touch-icon.png", sizes: "180x180" },
    ],
    shortcut: [
      { url: "/branding/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
  },
};

export const viewport = {
  themeColor: "#0b1220",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <body>
        <ThemeRegistry>
          <AuthProvider>
            <PWA />
            {children}
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}

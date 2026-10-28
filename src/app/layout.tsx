import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Big_Shoulders_Inline, Geist } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Títulos: condensada de rotulación (branding §4).
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
});

// Solo para el wordmark «ORTIZ»: su doble trazo recuerda al tubo de neón.
const bigShouldersInline = Big_Shoulders_Inline({
  variable: "--font-sign",
  subsets: ["latin"],
  weight: ["800"],
});

export const metadata: Metadata = {
  title: "Ortiz Barbershop",
  description: "Apúntate al corte con Raúl",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0706",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${bigShoulders.variable} ${bigShouldersInline.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-night text-text">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

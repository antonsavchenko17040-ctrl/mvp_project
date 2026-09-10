import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { FormNativeValidationUk } from "@/components/form-native-validation-uk";
import { Toaster } from "@/components/ui/sonner";
import { uk } from "@/lib/i18n/uk";

const fixelDisplay = localFont({
  src: [
    { path: "./fonts/FixelDisplay/FixelDisplay-Thin.woff2", weight: "100", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-ThinItalic.woff2", weight: "100", style: "italic" },
    { path: "./fonts/FixelDisplay/FixelDisplay-ExtraLight.woff2", weight: "200", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-ExtraLightItalic.woff2", weight: "200", style: "italic" },
    { path: "./fonts/FixelDisplay/FixelDisplay-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-LightItalic.woff2", weight: "300", style: "italic" },
    { path: "./fonts/FixelDisplay/FixelDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-RegularItalic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/FixelDisplay/FixelDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-MediumItalic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/FixelDisplay/FixelDisplay-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-SemiBoldItalic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/FixelDisplay/FixelDisplay-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-BoldItalic.woff2", weight: "700", style: "italic" },
    { path: "./fonts/FixelDisplay/FixelDisplay-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-ExtraBoldItalic.woff2", weight: "800", style: "italic" },
    { path: "./fonts/FixelDisplay/FixelDisplay-Black.woff2", weight: "900", style: "normal" },
    { path: "./fonts/FixelDisplay/FixelDisplay-BlackItalic.woff2", weight: "900", style: "italic" },
  ],
  variable: "--font-fixel-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: uk.appName,
  description: "MVP автоматизації життєвого циклу аудиторських рекомендацій",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${fixelDisplay.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <FormNativeValidationUk />
        {children}
        <Toaster />
      </body>
    </html>
  );
}

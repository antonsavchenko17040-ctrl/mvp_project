import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FormNativeValidationUk } from "@/components/form-native-validation-uk";
import { Toaster } from "@/components/ui/sonner";
import { uk } from "@/lib/i18n/uk";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <FormNativeValidationUk />
        {children}
        <Toaster />
      </body>
    </html>
  );
}

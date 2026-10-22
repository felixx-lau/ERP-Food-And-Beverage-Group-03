import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rasa Aruna Kitchen — ERP System (Odoo 17.0 Reference)",
  description: "Enterprise ERP System for PT Rasa Aruna Bersama",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-gray-50 text-gray-900 flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}

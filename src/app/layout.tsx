import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Ruta Didáctica · Cada aprendizaje tiene su camino",
  description:
    "Cuatro rutas de acompañamiento docente alineadas al NEM 2022 para primaria: Base, Visual, Seguimiento e Integral.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ fontFamily: "Aptos, 'Segoe UI', Arial, sans-serif" }}>
        <StoreProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}

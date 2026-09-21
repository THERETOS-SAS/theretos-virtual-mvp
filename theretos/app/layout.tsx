import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import { SupabaseProfileSync } from "../components/SupabaseProfileSync";

export const metadata: Metadata = {
  title: "THERETOS | Juega. Compite. Gana.",
  description:
    "THERETOS es un ecosistema de retos físicos, juegos virtuales, torneos, eTickets y premios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <SupabaseProfileSync />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
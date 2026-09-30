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
          <aside aria-label="Aviso de demostración" style={{ padding: "0.75rem 1rem", textAlign: "center", background: "#211b30", color: "#fff" }}>
            eTickets, XP, niveles y actividad de juego son datos demo, sin valor real. Los datos de tu cuenta se guardan en Supabase.
          </aside>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

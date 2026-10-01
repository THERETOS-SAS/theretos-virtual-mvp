import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ResendConfirmationForm } from "@/components/ResendConfirmationForm";

export const metadata: Metadata = {
  title: "Confirmar correo | THERETOS",
  description: "Solicita un nuevo enlace para confirmar tu cuenta THERETOS.",
  robots: { index: false, follow: false },
};

export default function ResendConfirmationPage() {
  return (
    <main className="site-shell account-page">
      <Header />
      <div className="account-content account-recovery">
        <section className="account-panel">
          <span className="eyebrow">ACCESO THERETOS</span>
          <h1>CONFIRMA TU CORREO</h1>
          <p>Solicita un enlace nuevo para completar la confirmación de tu registro.</p>
          <ResendConfirmationForm />
          <Link href="/login" className="account-back-link">Volver a iniciar sesión</Link>
        </section>
      </div>
      <Footer />
    </main>
  );
}

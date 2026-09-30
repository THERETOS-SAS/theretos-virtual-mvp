import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Nueva contraseña | THERETOS",
  description: "Elige una nueva contraseña para tu cuenta THERETOS.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const invalidLink = ["error", "error_code", "error_description"].some((key) => params[key] !== undefined);
  return (
    <main className="site-shell account-page">
      <Header />
      <div className="account-content account-recovery">
        <section className="account-panel">
          <span className="eyebrow">ACCESO THERETOS</span>
          <h1>NUEVA CONTRASEÑA</h1>
          <p>Elige una contraseña nueva para recuperar el acceso a tu cuenta.</p>
          <ResetPasswordForm invalidLink={invalidLink} />
        </section>
      </div>
      <Footer />
    </main>
  );
}

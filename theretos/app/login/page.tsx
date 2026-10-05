import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconArrow, IconGamepad, IconProgress, IconTrophy } from "../../components/icons";
import { LoginForm } from "../../components/LoginForm";
import { LoginConfirmationNotice } from "../../components/LoginConfirmationNotice";
import { LogoutFeedback } from "../../components/AuthUX";

export const metadata: Metadata = { title: "Iniciar sesión | THERETOS", description: "Vuelve a tu cuenta THERETOS." };

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hasError = ["error", "error_code", "error_description"].some((key) => params[key] !== undefined);
  const intent = hasError ? "error" : params.confirmed === "1" ? "confirm" : "none";
  return (
    <main className="site-shell account-page">
      <Header />
      <div className="account-content">
        <nav className="account-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>›</span><span aria-current="page">Iniciar sesión</span></nav>
        <div className="account-layout">
          <section className="account-intro">
            <span className="eyebrow">MI THERETOS</span>
            <h1>VUELVE<br /><em>AL JUEGO.</em></h1>
            <p>Accede a tu cuenta y mantén actualizados tus datos. El progreso, los torneos y los eTickets siguen en demostración.</p>
            <div className="account-benefits"><span><IconProgress /> Actualiza tus datos</span><span><IconTrophy /> Explora los torneos demo</span><span><IconGamepad /> Practica los juegos</span></div>
          </section>
          <section className="account-panel">
            <h2>Bienvenido de nuevo</h2>
            <LogoutFeedback />
            <LoginConfirmationNotice intent={intent} />
            <LoginForm />
            <Link href="/forgot-password" className="account-text-link">¿Olvidaste tu contraseña?</Link>
            <Link href="/resend-confirmation" className="account-text-link">¿Necesitas confirmar tu correo?</Link>
            <div className="account-panel-footer"><span>¿Aún no tienes cuenta?</span><p>Crea tu cuenta y explora THERETOS.</p><Link href="/signup">Crear cuenta <IconArrow /></Link></div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

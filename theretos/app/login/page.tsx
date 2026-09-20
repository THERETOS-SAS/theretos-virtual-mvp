import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconArrow, IconGamepad, IconProgress, IconTrophy } from "../../components/icons";
import { LoginForm } from "../../components/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión | THERETOS", description: "Vuelve a tu cuenta THERETOS." };

export default function LoginPage() {
  return <main className="site-shell account-page"><Header /><div className="account-content"><nav className="account-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>›</span><span aria-current="page">Iniciar sesión</span></nav><div className="account-layout"><section className="account-intro"><span className="eyebrow">MI THERETOS</span><h1>VUELVE<br /><em>AL JUEGO.</em></h1><p>Inicia sesión para guardar tu progreso, competir en torneos y administrar tus eTickets.</p><div className="account-benefits"><span><IconProgress /> Guarda tu progreso</span><span><IconTrophy /> Compite en torneos</span><span><IconGamepad /> Conserva tus récords</span></div></section><section className="account-panel"><h2>Bienvenido de nuevo</h2><LoginForm /><Link href="/forgot-password" className="account-text-link">¿Olvidaste tu contraseña?</Link><div className="account-panel-footer"><span>¿Aún no tienes cuenta?</span><p>Crea tu cuenta, guarda tu progreso y recibe un bono de bienvenida.</p><Link href="/signup">Crear cuenta <IconArrow /></Link></div></section></div></div><Footer /></main>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "../../components/BackLink";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconCoins } from "../../components/icons";
import { SignupForm } from "../../components/SignupForm";
import { platformConfig } from "../../data/platformConfig";

export const metadata: Metadata = { title: "Crear cuenta | THERETOS", description: "Crea tu cuenta THERETOS y guarda tu progreso." };

export default function SignupPage() {
  return <main className="site-shell account-page"><Header /><div className="account-content"><nav className="account-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>›</span><span aria-current="page">Crear cuenta</span></nav><BackLink href="/login" label="Iniciar sesión" /><div className="account-layout signup-layout"><section className="account-intro"><span className="eyebrow">ÚNETE A THERETOS</span><h1>CREA TU CUENTA.<br /><em>ENTRA A LA <br className="signup-title-break" />COMPETENCIA.</em></h1><p>Practica gratis cuando quieras. Con tu cuenta podrás guardar tu progreso, acumular XP y participar en torneos.</p>{platformConfig.welcomeBonusEtickets > 0 && <aside className="welcome-bonus"><span><IconCoins /></span><div><small>BONO DE BIENVENIDA</small><strong>+{platformConfig.welcomeBonusEtickets} eTickets</strong><p>Recíbelos al completar tu registro.</p></div></aside>}</section><section className="account-panel"><h2>Crea tu cuenta</h2><SignupForm /><p className="account-login-prompt">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p></section></div></div><Footer /></main>;
}

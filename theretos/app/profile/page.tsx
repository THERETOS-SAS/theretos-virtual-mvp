import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconArrow, IconGamepad, IconShield } from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";
import { ProfileDetailsEditor } from "../../components/ProfileDetailsEditor";
import { ProfileLiveOverview } from "../../components/PlayerLiveCards";

export const metadata: Metadata = { title: "Mi perfil | THERETOS", description: "Consulta tu progreso, saldo y actividad dentro de THERETOS." };

export default function ProfilePage() {
  return <main className="site-shell profile-page"><Header /><div className="profile-content"><nav className="profile-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>›</span><span aria-current="page">Mi perfil</span></nav><section className="profile-hero"><span className="eyebrow">MI CUENTA</span><h1>TU PROGRESO.<br /><span>TUS ETICKETS.</span><br />TU HISTORIA.</h1></section><ProfileLiveOverview /><section className="profile-details"><div><span>INFORMACIÓN DEL JUGADOR</span><h2>Datos de la cuenta</h2></div><ProfileDetailsEditor /></section><section className="profile-security-grid"><article><IconShield /><div><small>VERIFICACIÓN</small><h2>Información cuando sea necesaria</h2><p>No necesitas completar información adicional para practicar. Algunos procesos, como la entrega o canje de determinados premios, podrían requerir información adicional.</p><button type="button" disabled>Completar más adelante</button></div></article><article><IconGamepad /><div><small>SEGURIDAD Y CUENTA</small><h2>Control de acceso</h2><p>Estas acciones se conectarán al sistema real de autenticación.</p><button type="button" disabled>Cambiar contraseña · Próximamente</button><Link href="/">Cerrar sesión <IconArrow /></Link></div></article></section></div><Footer /><MobileNavigation active="profile" /></main>;
}

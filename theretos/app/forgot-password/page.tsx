import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "../../components/BackLink";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconArrow } from "../../components/icons";
import { MockForgotPasswordForm } from "../../components/MockForgotPasswordForm";

export const metadata: Metadata = { title: "Recuperar cuenta | THERETOS", description: "Recupera el acceso a tu cuenta THERETOS." };

export default function ForgotPasswordPage() {
  return <main className="site-shell account-page"><Header /><div className="account-content account-recovery"><nav className="account-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>›</span><span aria-current="page">Recuperar cuenta</span></nav><BackLink href="/login" label="Iniciar sesión" /><section className="account-panel"><span className="eyebrow">ACCESO THERETOS</span><h1>RECUPERA TU CUENTA</h1><p>Ingresa el correo asociado a tu cuenta y te enviaremos instrucciones para recuperar el acceso.</p><MockForgotPasswordForm /><Link href="/login" className="account-back-link">Volver a iniciar sesión <IconArrow /></Link></section></div><Footer /></main>;
}

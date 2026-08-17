"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { platformConfig } from "../data/platformConfig";
import { AccountFormField } from "./AccountFormField";
import { IconCheckCircle, IconCoins } from "./icons";
import { safeReturnUrl, useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";

export function MockSignupForm() {
  const [created, setCreated] = useState(false);
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; name: string; email: string; phone: string } | undefined>();
  const { signupDemo } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!created) return; const params = new URLSearchParams(window.location.search); signupDemo(profile); router.push(safeReturnUrl(params.get("returnTo") ?? params.get("returnUrl"))); }, [created, profile, router, signupDemo]);
  if (created) return <section className="account-success" aria-live="polite"><IconCheckCircle /><span>CUENTA CREADA</span><h2>{platformConfig.welcomeBonusEtickets > 0 ? "Tu bono de bienvenida está listo." : "Tu perfil está listo."}</h2>{platformConfig.welcomeBonusEtickets > 0 && <strong><IconCoins /> +{platformConfig.welcomeBonusEtickets} eTickets</strong>}<p>Esta confirmación pertenece al flujo frontend del MVP.</p><Link href="/profile" onClick={(event) => { event.preventDefault(); const params = new URLSearchParams(window.location.search); signupDemo(); router.push(safeReturnUrl(params.get("returnTo") ?? params.get("returnUrl"))); }}>Continuar</Link></section>;
  return <form className="account-form signup-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const firstName = String(form.get("signup-name") ?? "Jugador"); const lastName = String(form.get("signup-last-name") ?? ""); setProfile({ firstName, lastName, name: `${firstName} ${lastName}`.trim(), email: String(form.get("signup-email") ?? "jugador@theretos.co"), phone: String(form.get("signup-phone") ?? "") }); setCreated(true); }}><div className="account-form-row"><AccountFormField id="signup-name" name="signup-name" label="Nombre" autoComplete="given-name" required /><AccountFormField id="signup-last-name" name="signup-last-name" label="Apellido" autoComplete="family-name" required /></div><AccountFormField id="signup-email" name="signup-email" label="Correo electrónico" type="email" autoComplete="email" required /><AccountFormField id="signup-phone" name="signup-phone" label="Número de celular" hint="Opcional" type="tel" autoComplete="tel" /><div className="account-form-row"><AccountFormField id="signup-password" label="Contraseña" type="password" autoComplete="new-password" minLength={8} required /><AccountFormField id="signup-confirm" label="Confirmar contraseña" type="password" autoComplete="new-password" minLength={8} required /></div><label className="account-checkbox"><input type="checkbox" required /><span>He leído y acepto los Términos y la Política de Privacidad.</span></label><label className="account-checkbox"><input type="checkbox" required /><span>Confirmo que cumplo con los requisitos de edad aplicables para utilizar THERETOS.</span></label><label className="account-checkbox"><input type="checkbox" /><span>Quiero recibir novedades y promociones de THERETOS. <small>Opcional</small></span></label><button type="submit" className="account-submit">Crear cuenta</button></form>;
}

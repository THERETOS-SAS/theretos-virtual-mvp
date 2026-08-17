"use client";

import { useRouter } from "next/navigation";
import { safeReturnUrl, useAuth } from "./AuthProvider";
import { AccountFormField } from "./AccountFormField";

export function MockLoginForm() {
  const router = useRouter();
  const { loginDemo } = useAuth();
  const completeLogin = () => { const params = new URLSearchParams(window.location.search); loginDemo(); router.push(safeReturnUrl(params.get("returnTo") ?? params.get("returnUrl"))); };
  return <form className="account-form" onSubmit={(event) => { event.preventDefault(); completeLogin(); }}><AccountFormField id="login-email" label="Correo electrónico" type="email" autoComplete="email" required /><AccountFormField id="login-password" label="Contraseña" type="password" autoComplete="current-password" required /><button type="submit" className="account-submit">Iniciar sesión</button><button type="button" className="account-google" onClick={completeLogin}>Continuar con Google <small>Demo</small></button></form>;
}

"use client";

import { useState } from "react";
import { AccountFormField } from "./AccountFormField";
import { IconCheckCircle } from "./icons";

export function MockForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  if (sent) return <section className="account-success" aria-live="polite"><IconCheckCircle /><span>REVISA TU CORREO</span><h2>Continúa desde tu bandeja de entrada.</h2><p>Si existe una cuenta asociada a esa dirección, recibirás instrucciones para continuar.</p></section>;
  return <form className="account-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><AccountFormField id="recovery-email" label="Correo electrónico" type="email" autoComplete="email" required /><button type="submit" className="account-submit">Enviar instrucciones</button></form>;
}

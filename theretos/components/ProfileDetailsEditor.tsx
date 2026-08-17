"use client";

import { useState } from "react";
import { AccountFormField } from "./AccountFormField";
import { useAuth } from "./AuthProvider";

export function ProfileDetailsEditor() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  return <div className="profile-details-editor"><dl><div><dt>Nombre</dt><dd>{user.name}</dd></div><div><dt>Correo</dt><dd>{user.email}</dd></div><div><dt>Celular</dt><dd>{user.phone || "Sin registrar"}</dd></div></dl><button type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Cancelar" : "Editar datos"}</button>{editing && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const firstName = String(form.get("profile-first-name") ?? user.firstName); const lastName = String(form.get("profile-last-name") ?? user.lastName); updateProfile({ firstName, lastName, name: `${firstName} ${lastName}`.trim(), phone: String(form.get("profile-phone") ?? "") }); setEditing(false); }}><div className="account-form-row"><AccountFormField id="profile-first-name" name="profile-first-name" label="Nombre" defaultValue={user.firstName} /><AccountFormField id="profile-last-name" name="profile-last-name" label="Apellido" defaultValue={user.lastName} /></div><AccountFormField id="profile-phone" name="profile-phone" label="Celular" type="tel" defaultValue={user.phone} placeholder="Sin registrar" /><AccountFormField id="profile-email" label="Correo" type="email" value={user.email} readOnly /><button type="submit">Guardar cambios demo</button><small>Los cambios se guardan localmente en este MVP.</small></form>}</div>;
}

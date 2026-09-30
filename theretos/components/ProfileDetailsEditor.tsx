"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveOwnProfile } from "@/lib/supabase/profile";
import { AccountFormField } from "./AccountFormField";
import { useAuth, type DemoPlayer } from "./AuthProvider";

export function ProfileDetailsEditor() {
  const { user, sessionUserId, isReady, profileStatus, loadProfile } = useAuth();
  if (!isReady || (sessionUserId && profileStatus === "loading")) {
    return <p role="status">Cargando tu perfil…</p>;
  }
  if (!user || !sessionUserId) return null;
  if (profileStatus === "error") {
    return <div><p role="alert">No pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.</p><button type="button" onClick={() => void loadProfile()}>Reintentar</button></div>;
  }

  return <ProfileForm key={sessionUserId} user={user} userId={sessionUserId} />;
}

function ProfileForm({ user, userId }: { user: DemoPlayer; userId: string }) {
  const { updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const savingRef = useRef(false);
  const activeRef = useRef(true);
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  useEffect(() => {
    if (!success || !successRef.current) return;
    // Al cerrar el formulario cambia la altura de la página. Llevar la
    // confirmación a la vista evita que quede fuera de pantalla en móvil.
    successRef.current.focus({ preventScroll: true });
    successRef.current.scrollIntoView({ block: "center" });
  }, [success]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const form = new FormData(event.currentTarget);
    savingRef.current = true;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const profile = await saveOwnProfile(createClient(), userId, {
        firstName: String(form.get("profile-first-name") ?? ""),
        lastName: String(form.get("profile-last-name") ?? ""),
        phone: String(form.get("profile-phone") ?? ""),
      });
      const applied = updateProfile(profile, userId);
      if (!activeRef.current) return;
      if (!applied) {
        setError("Tu sesión cambió. Vuelve a abrir tu perfil.");
        return;
      }
      setEditing(false);
      setSuccess("Tus datos se guardaron correctamente.");
    } catch (cause) {
      if (activeRef.current) {
        setError(cause instanceof Error ? cause.message : "No pudimos guardar tu perfil. Inténtalo de nuevo.");
      }
    } finally {
      savingRef.current = false;
      if (activeRef.current) setSaving(false);
    }
  }

  return (
    <div className="profile-details-editor">
      {success && (
        <p ref={successRef} className="profile-save-success" role="status" aria-atomic="true" tabIndex={-1}>
          <strong>Datos guardados</strong>
          <span>{success}</span>
        </p>
      )}
      <dl>
        <div><dt>Nombre</dt><dd>{user.name}</dd></div>
        <div><dt>Correo</dt><dd>{user.email}</dd></div>
        <div><dt>Celular</dt><dd>{user.phone || "Sin registrar"}</dd></div>
      </dl>
      <button type="button" disabled={saving} onClick={() => {
        setEditing((value) => !value);
        setError("");
        setSuccess("");
      }}>{editing ? "Cancelar" : "Editar datos"}</button>
      {editing && (
        <form onSubmit={handleSubmit} aria-busy={saving}>
          <div className="account-form-row">
            <AccountFormField id="profile-first-name" name="profile-first-name" label="Nombre" autoComplete="given-name" defaultValue={user.firstName} required disabled={saving} />
            <AccountFormField id="profile-last-name" name="profile-last-name" label="Apellido" autoComplete="family-name" defaultValue={user.lastName} required disabled={saving} />
          </div>
          <AccountFormField id="profile-phone" name="profile-phone" label="Celular" type="tel" autoComplete="tel" defaultValue={user.phone} placeholder="Sin registrar" disabled={saving} />
          <AccountFormField id="profile-email" label="Correo" type="email" value={user.email} readOnly />
          <button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
          <small>El correo no se modifica desde este formulario.</small>
          {saving && <p role="status">Guardando tus datos…</p>}
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

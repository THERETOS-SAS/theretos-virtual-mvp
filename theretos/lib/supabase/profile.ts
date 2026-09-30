import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_COLUMNS = "first_name,last_name,display_name,phone";

type StoredProfile = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
};

export function profileDetails(profile: StoredProfile) {
  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  return {
    firstName,
    lastName,
    name: profile.display_name || `${firstName} ${lastName}`.trim() || "Jugador THERETOS",
    phone: profile.phone ?? "",
  };
}

export async function saveOwnProfile(
  supabase: SupabaseClient,
  expectedUserId: string,
  input: { firstName: string; lastName: string; phone: string },
) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    throw new Error("Completa tu nombre y apellido.");
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== expectedUserId) {
    throw new Error("Tu sesión cambió o expiró. Vuelve a iniciar sesión antes de guardar.");
  }

  // RLS en public.profiles debe exigir auth.uid() = id. Nunca hacer upsert
  // ni enviar correo, id, eTickets, XP u otros campos desde el formulario.
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      display_name: `${firstName} ${lastName}`,
      phone: input.phone.trim(),
    })
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  // single() evita anunciar éxito si RLS filtró la actualización a cero filas.
  if (error || !data) {
    throw new Error("No pudimos guardar tu perfil. Revisa tu conexión e inténtalo de nuevo. Si persiste, contacta soporte.");
  }

  return profileDetails(data);
}

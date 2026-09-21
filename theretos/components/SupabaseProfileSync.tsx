"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

export function SupabaseProfileSync() {
  const { updateProfile } = useAuth();

  useEffect(() => {
    let active = true;

    async function syncProfile() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_name,last_name,display_name,phone")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("No pudimos cargar el perfil THERETOS", error);
        return;
      }

      if (!active) return;

      const firstName = profile?.first_name ?? "";
      const lastName = profile?.last_name ?? "";

      updateProfile({
        firstName,
        lastName,
        name:
          profile?.display_name ||
          `${firstName} ${lastName}`.trim() ||
          user.email ||
          "Jugador THERETOS",
        email: user.email ?? "",
        phone: profile?.phone ?? "",
      });
    }

    syncProfile();

    return () => {
      active = false;
    };
  }, [updateProfile]);

  return null;
}
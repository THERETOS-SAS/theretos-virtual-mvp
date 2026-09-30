"use client";

import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

export function SupabaseProfileSync() {
  const { sessionUserId, loadProfile } = useAuth();

  // Cargar fuera de onAuthStateChange; también cubre login y cambio de cuenta
  // sin recargar el layout. AuthProvider descarta respuestas de sesiones viejas.
  useEffect(() => {
    if (sessionUserId) void loadProfile();
  }, [sessionUserId, loadProfile]);

  return null;
}

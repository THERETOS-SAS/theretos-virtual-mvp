import { platformConfig } from "./platformConfig";

// Estado mock del MVP. Sustituir por el usuario autenticado cuando exista backend.

export const mockPlayer = {
  id: "demo-player",
  name: "Jugador demo",
  firstName: "Jugador",
  lastName: "Demo",
  email: "jugador@theretos.co",
  phone: "",
  etickets: 120,
  xp: 2450,
  level: 8,
  nextLevelXp: 3000,
  welcomeBonusEtickets: platformConfig.welcomeBonusEtickets,
} as const;

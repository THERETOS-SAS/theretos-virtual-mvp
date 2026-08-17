export type MockGame = {
  slug: string;
  name: string;
  category: string;
  description: string;
  highScore: string;
  accentColor: "gold" | "purple" | "green" | "blue";
  icon: "coins" | "target" | "brain" | "bolt" | "runner";
  status: "available" | "coming-soon";
  practiceUrl: string | null;
  longDescription: string;
  instructions: readonly string[];
  ranking: readonly { position: number; player: string; score: string }[];
};

const demoRanking = [
  { position: 1, player: "Jugador Nova", score: "9,840" },
  { position: 2, player: "Jugador Pixel", score: "9,210" },
  { position: 3, player: "Jugador Demo", score: "8,420" },
] as const;

// Catálogo oficial provisional expuesto por el portal.
export const mockGames: MockGame[] = [
  { slug: "atrapa-monedas", name: "Atrapa Monedas", category: "Reflejos y velocidad", description: "Atrapa tantas monedas como puedas antes de que termine el tiempo.", highScore: "8,420", accentColor: "gold", icon: "coins", status: "available", practiceUrl: null, longDescription: "Atrapa objetivos antes de que termine el tiempo y supera tu mejor marca.", instructions: ["Inicia el reto.", "Atrapa tantas monedas como puedas.", "Supera tu mejor puntuación."], ranking: demoRanking },
  { slug: "tap-frenetico", name: "Tap Frenético", category: "Velocidad y reacción", description: "Demuestra qué tan rápido puedes reaccionar.", highScore: "—", accentColor: "purple", icon: "bolt", status: "available", practiceUrl: null, longDescription: "Un reto directo de velocidad y reacción.", instructions: ["Inicia el reto.", "Reacciona a cada objetivo.", "Acumula la mayor puntuación posible."], ranking: demoRanking },
  { slug: "revienta-globos", name: "Revienta Globos", category: "Precisión y velocidad", description: "Revienta los objetivos correctos y acumula la mejor puntuación.", highScore: "—", accentColor: "green", icon: "target", status: "available", practiceUrl: null, longDescription: "Combina precisión y velocidad para identificar los objetivos correctos.", instructions: ["Inicia el reto.", "Identifica los objetivos correctos.", "Suma puntos sin perder precisión."], ranking: demoRanking },
  { slug: "golpea-topos", name: "Golpea Topos", category: "Reflejos y precisión", description: "Golpea los objetivos a tiempo y supera tu mejor marca.", highScore: "—", accentColor: "gold", icon: "runner", status: "available", practiceUrl: null, longDescription: "Pon a prueba tus reflejos golpeando cada objetivo a tiempo.", instructions: ["Inicia el reto.", "Golpea los objetivos cuando aparezcan.", "Supera tu mejor marca."], ranking: demoRanking },
];

// Prototipos conservados para compatibilidad; no forman parte del catálogo público.
mockGames.push({ slug: "bolas", name: "Bolas", category: "Control y supervivencia", description: "Dirige la bola, elimina obstáculos y evita a los enemigos.", highScore: "—", accentColor: "green", icon: "target", status: "available", practiceUrl: null, longDescription: "Supera niveles controlando el impulso de la bola y conservando tus tres vidas.", instructions: ["Toca una posición para impulsar la bola.", "Elimina los obstáculos dorados.", "Evita los enemigos rojos y supera los 15 niveles."], ranking: demoRanking });

export const legacyMockGames: MockGame[] = [
  { slug: "tiro-perfecto", name: "Tiro Perfecto", category: "Precisión y timing", description: "Calcula el momento exacto para acertar cada objetivo.", highScore: "6,780", accentColor: "purple", icon: "target", status: "coming-soon", practiceUrl: null, longDescription: "Prototipo de precisión conservado para uso futuro.", instructions: ["Observa el objetivo.", "Calcula el momento correcto.", "Mantén tu precisión."], ranking: demoRanking },
  { slug: "memoria-flash", name: "Memoria Flash", category: "Memoria y concentración", description: "Recuerda patrones y supera secuencias.", highScore: "5,950", accentColor: "blue", icon: "brain", status: "coming-soon", practiceUrl: null, longDescription: "Prototipo de memoria conservado para uso futuro.", instructions: ["Observa la secuencia.", "Repite el patrón.", "Supera tu marca."], ranking: demoRanking },
];

export const allMockGames = [...mockGames, ...legacyMockGames];

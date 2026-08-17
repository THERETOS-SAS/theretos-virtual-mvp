import { isPlayableGameSlug } from "../../lib/games/registry";
import type { GameEngineProps } from "../../types/games";
import { BalloonPopEngine } from "./engines/BalloonPopEngine";
import { BallsEngine } from "./engines/BallsEngine";
import { CoinCatchEngine } from "./engines/CoinCatchEngine";
import { FreneticTapEngine } from "./engines/FreneticTapEngine";
import { WhackAMoleEngine } from "./engines/WhackAMoleEngine";

export function RegisteredGameEngine({ gameSlug, ...props }: GameEngineProps & { gameSlug: string }) {
  if (!isPlayableGameSlug(gameSlug)) return null;
  if (gameSlug === "atrapa-monedas") return <CoinCatchEngine {...props} />;
  if (gameSlug === "tap-frenetico") return <FreneticTapEngine {...props} />;
  if (gameSlug === "revienta-globos") return <BalloonPopEngine {...props} />;
  if (gameSlug === "golpea-topos") return <WhackAMoleEngine {...props} />;
  return <BallsEngine {...props} />;
}

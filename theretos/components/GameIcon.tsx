import type { MockGame } from "../data/mockGames";
import { IconBolt, IconBrain, IconCoins, IconCrosshair, IconRunner } from "./icons";

const gameIcons = {
  coins: IconCoins,
  target: IconCrosshair,
  brain: IconBrain,
  bolt: IconBolt,
  runner: IconRunner,
};

export function GameIcon({ icon }: Pick<MockGame, "icon">) {
  const Icon = gameIcons[icon];
  return <Icon />;
}

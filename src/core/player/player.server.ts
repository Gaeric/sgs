import { PlayerAI } from "../ai/ai";
import { SmartAI } from "../ai/smart_ai";
import { TrustAI } from "../ai/trust_ai";
import { CharacterId } from "../characters/character";
import { Player } from "./player";
import { GameMode } from "../shares/types/room_props";
import {
  PlayerCards,
  PlayerCardsArea,
  PlayerCardsOutside,
  PlayerId,
  PlayerStatus,
} from "./player_props";

export class ServerPlayer extends Player {
  constructor(
    protected playerId: PlayerId,
    protected playerName: string,
    protected playerPosition: number,
    playerCharacterId?: CharacterId,
    playerCards?: PlayerCards & {
      [PlayerCardsArea.OutsideArea]: PlayerCardsOutside;
    },
    ai: PlayerAI = TrustAI.Instance
  ) {
    super(playerCards, playerCharacterId, ai);
  }

  protected status = PlayerStatus.Online;
}

export class SmartPlayer extends ServerPlayer {
  constructor(protected playerPosition: number, gameMode: GameMode) {
    super(
      `SmartAI-${playerPosition}:${Date.now()}`,
      "AI",
      playerPosition,
      undefined,
      undefined,
      SmartAI.Instance
    );
    this.delegateOnSmartAI();
  }
}

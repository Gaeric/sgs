import { CardColor } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardUseStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";
import { ZhouFu } from "./zhoufu";

@CompulsorySkill({ name: "yingbing", description: "yingbing_description" })
export class YingBing extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === CardUseStage.CardUsing;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): boolean {
    const zhou = room
      .getPlayerById(event.fromId)
      .getCardIds(PlayerCardsArea.OutsideArea, ZhouFu.Name);
    return (
      zhou.length > 0 &&
      Sanguosha.getCardById(event.cardId).Color !== CardColor.None &&
      Sanguosha.getCardById(event.cardId).Color ===
        Sanguosha.getCardById(zhou[0]).Color
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.drawCards(1, event.fromId, "top", event.fromId, this.Name);

    if (room.getFlag<PlayerId>(event.fromId, this.Name)) {
      room.getPlayerById(event.fromId).removeFlag(this.Name);
      const fromId = (
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardUseEvent>
      ).fromId;
      const zhou = room
        .getPlayerById(fromId)
        .getCardIds(PlayerCardsArea.OutsideArea, ZhouFu.Name);
      if (zhou.length > 0) {
        await room.moveCards({
          movingCards: zhou.map((card) => ({
            card,
            fromArea: CardMoveArea.OutsideArea,
          })),
          fromId,
          toId: event.fromId,
          toArea: CardMoveArea.HandArea,
          moveReason: CardMoveReason.ActivePrey,
          proposer: event.fromId,
          triggeredBySkills: [this.Name],
        });
      }
    } else {
      room
        .getPlayerById(event.fromId)
        .setFlag<PlayerId>(
          this.Name,
          (
            event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardUseEvent>
          ).fromId
        );
    }

    return true;
  }
}

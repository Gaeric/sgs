import { AiLibrary } from "../../../ai_lib";
import { TriggerSkillTriggerClass } from "../../base/trigger_skill_trigger";
import { GameEventIdentifiers, ServerEventFinder } from "../../../../event/event";
import { Sanguosha } from "../../../../game/engine";
import { Player } from "../../../../player/player";
import { PlayerCardsArea } from "../../../../player/player_props";
import { Room } from "../../../../room/room";
import { ZhenLie } from "../../../../skills";

export class ZhenLieSkillTrigger extends TriggerSkillTriggerClass<
  ZhenLie,
  GameEventIdentifiers.AimEvent
> {
  skillTrigger = (
    room: Room,
    ai: Player,
    skill: ZhenLie,
    onEvent?: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ) => {
    if (onEvent !== undefined) {
      const hasPeachorAlcohol: boolean =
        ai
          .getCardIds(PlayerCardsArea.HandArea)
          .filter(
            (cardId) =>
              Sanguosha.getCardById(cardId).Name === "alcohol" ||
              Sanguosha.getCardById(cardId).Name === "peach"
          ).length > 0;
      const fromFriend: boolean = AiLibrary.areTheyFriendly(
        ai,
        room.getPlayerById(onEvent.fromId),
        room.Info.gameMode
      );

      if (!fromFriend && (ai.Hp > 2 || hasPeachorAlcohol)) {
        return {
          fromId: ai.Id,
          invoke: skill.Name,
        };
      }
    } else {
      return undefined;
    }
  };
}

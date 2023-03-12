import { AiLibrary } from "../../../ai_lib";
import { TriggerSkillTriggerClass } from "../../base/trigger_skill_trigger";
import { GameEventIdentifiers, ServerEventFinder } from "../../../../event/event";
import { Player } from "../../../../player/player";
import { Room } from "../../../../room/room";
import { BeiGe } from "../../../../skills";

export class BeiGeSkillTrigger extends TriggerSkillTriggerClass<
  BeiGe,
  GameEventIdentifiers.DamageEvent
> {
  public readonly skillTrigger = (
    room: Room,
    ai: Player,
    skill: BeiGe,
    onEvent?: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ) => {
    const cards = ai
      .getCardIds()
      .filter((card) => room.canDropCard(ai.Id, card));
    if (cards.length > 0 && onEvent !== undefined && onEvent.fromId) {
      if (
        !AiLibrary.areTheyFriendly(
          ai,
          room.getPlayerById(onEvent.fromId),
          room.Info.gameMode
        )
      ) {
        return {
          fromId: ai.Id,
          invoke: skill.Name,
          cardIds: AiLibrary.sortCardbyValue(cards, false).slice(0, 1),
        };
      }
    }
  };
}

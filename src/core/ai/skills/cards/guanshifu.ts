import { AiLibrary } from "../../ai_lib";
import type { CardId } from "../../../cards/libs/card_props";
import type {
  ClientEventFinder,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import type { GuanShiFuSkill } from "../../../skills";
import { TriggerSkillTriggerClass } from "../base/trigger_skill_trigger";

export class GuanShiFuSkillTrigger extends TriggerSkillTriggerClass<
  GuanShiFuSkill,
  GameEventIdentifiers.CardEffectEvent
> {
  skillTrigger = (
    room: Room,
    ai: Player,
    skill: GuanShiFuSkill,
    onEvent?: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>,
    skillInCard?: CardId
  ):
    | ClientEventFinder<GameEventIdentifiers.AskForSkillUseEvent>
    | undefined => {
    const cards = ai.getCardIds().filter((card) => card !== skillInCard);
    let shouldUse = false;
    if (cards.length < 2) {
      return;
    }

    if (cards.length <= 4) {
      const inDangerEnemy = onEvent!.toIds!.find(
        (toId) => room.getPlayerById(toId).Hp <= 2
      );
      if (inDangerEnemy) {
        shouldUse = true;
      }
    } else {
      shouldUse = true;
    }

    if (!shouldUse) {
      return;
    }

    return {
      fromId: ai.Id,
      invoke: skill.Name,
      cardIds: AiLibrary.sortCardbyValue(cards, false).slice(0, 2),
    };
  };
}

import { ActiveSkillTriggerClass } from "../base/active_skill_trigger";
import type { CardId } from "../../../cards/libs/card_props";
import type {
  ClientEventFinder,
  GameEventIdentifiers,
} from "../../../event/event";
import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import type { PeachSkill } from "../../../skills";

export class PeachSkillTrigger extends ActiveSkillTriggerClass<PeachSkill> {
  skillTrigger = (
    room: Room,
    ai: Player,
    skill: PeachSkill,
    skillInCard?: CardId
  ): ClientEventFinder<GameEventIdentifiers.CardUseEvent> | undefined => ({
    fromId: ai.Id,
    cardId: skillInCard!,
  });
}

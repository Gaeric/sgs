import { ActiveSkillTriggerClass } from "../base/active_skill_trigger";
import type { CardId } from "../../../cards/libs/card_props";
import type {
  ClientEventFinder,
  GameEventIdentifiers,
} from "../../../event/event";
import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import type { WuZhongShengYouSkill } from "../../../skills";

export class WuZhongShengYouSkillTrigger extends ActiveSkillTriggerClass<WuZhongShengYouSkill> {
  skillTrigger = (
    room: Room,
    ai: Player,
    skill: WuZhongShengYouSkill,
    skillInCard?: CardId
  ): ClientEventFinder<GameEventIdentifiers.CardUseEvent> | undefined => ({
    fromId: ai.Id,
    cardId: skillInCard!,
  });
}

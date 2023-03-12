import { AiLibrary } from "../../ai_lib";
import { ActiveSkillTriggerClass } from "../base/active_skill_trigger";
import type { CardId } from "../../../cards/libs/card_props";
import type {
  ClientEventFinder,
  GameEventIdentifiers,
} from "../../../event/event";
import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import type { TaoYuanJieYiSkill } from "../../../skills";

export class TaoYuanJieYiSkillTrigger extends ActiveSkillTriggerClass<TaoYuanJieYiSkill> {
  skillTrigger = (
    room: Room,
    ai: Player,
    skill: TaoYuanJieYiSkill,
    skillInCard?: CardId
  ): ClientEventFinder<GameEventIdentifiers.CardUseEvent> | undefined => {
    const friends = AiLibrary.sortFriendsFromWeakToStrong(room, ai).filter(
      (f) => room.canUseCardTo(skillInCard!, ai, f) && f.isInjured()
    );
    const enemies = AiLibrary.sortEnemiesByRole(room, ai).filter(
      (e) => room.canUseCardTo(skillInCard!, ai, e) && e.isInjured()
    );
    const extra = ai.isInjured() ? 1 : 0;

    if (friends.length + extra < enemies.length) {
      return;
    }

    return {
      fromId: ai.Id,
      cardId: skillInCard!,
    };
  };
}

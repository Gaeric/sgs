import { AiLibrary } from "../../ai_lib";
import { ActiveSkillTriggerClass } from "../base/active_skill_trigger";
import { CardType } from "../../../cards/card";
import type { CardId } from "../../../cards/libs/card_props";
import type {
  ClientEventFinder,
  GameEventIdentifiers,
} from "../../../event/event";
import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import type { NanManRuQingSkill } from "../../../skills";

export class NanManRuQingSkillTrigger extends ActiveSkillTriggerClass<NanManRuQingSkill> {
  skillTrigger = (
    room: Room,
    ai: Player,
    skill: NanManRuQingSkill,
    skillInCard?: CardId
  ): ClientEventFinder<GameEventIdentifiers.CardUseEvent> | undefined => {
    const enemies = AiLibrary.sortEnemiesByRole(room, ai).filter(
      (e) =>
        room.canUseCardTo(skillInCard!, ai, e) &&
        !e.hasSkill("juxiang") &&
        !(e.getEquipment(CardType.Shield) && e.getShield()!.Name === "tengjia")
    );
    if (enemies.length < room.AlivePlayers.length / 2) {
      return;
    }

    return {
      fromId: ai.Id,
      cardId: skillInCard!,
    };
  };
}

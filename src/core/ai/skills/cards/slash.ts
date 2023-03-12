import { AiLibrary } from "../../ai_lib";
import { ActiveSkillTriggerClass } from "../base/active_skill_trigger";
import type { CardId } from "../../../cards/libs/card_props";
import type {
  ClientEventFinder,
  GameEventIdentifiers,
} from "../../../event/event";
import { DamageType } from "../../../game/game_props";
import type { Player } from "../../../player/player";
import type { PlayerId } from "../../../player/player_props";
import type { Room } from "../../../room/room";
import type { SlashSkill } from "../../../skills";

export class SlashSkillTrigger extends ActiveSkillTriggerClass<SlashSkill> {
  protected filterTargets(
    room: Room,
    ai: Player,
    skill: SlashSkill,
    card: CardId,
    enemies: Player[]
  ) {
    const pickedEnemies: PlayerId[] = [];

    if (skill.damageType === DamageType.Fire) {
      for (const e of enemies) {
        const shield = e.getShield();
        if (shield && shield.Name === "tengjia") {
          if (
            skill.targetFilter(room, ai, [...pickedEnemies, e.Id], [], card)
          ) {
            pickedEnemies.push(e.Id);
          }
        }
      }
    }

    for (const e of enemies) {
      if (pickedEnemies.includes(e.Id)) {
        continue;
      }

      if (skill.targetFilter(room, ai, [...pickedEnemies, e.Id], [], card)) {
        pickedEnemies.push(e.Id);
      }
    }

    return pickedEnemies;
  }

  skillTrigger = (
    room: Room,
    ai: Player,
    skill: SlashSkill,
    skillInCard?: CardId
  ): ClientEventFinder<GameEventIdentifiers.CardUseEvent> | undefined => {
    ai.removeInvisibleMark("drunk");
    const enemies = AiLibrary.sortEnemiesByRole(room, ai).filter(
      (e) =>
        skill.isAvailableTarget(ai.Id, room, e.Id, [], [], skillInCard!) &&
        AiLibrary.getAttackWillEffectSlashesTo(room, ai, e, [skillInCard!])
          .length > 0
    );

    if (enemies.length === 0) {
      return;
    }

    const targets = this.filterTargets(room, ai, skill, skillInCard!, enemies);

    if (targets.length === 0) {
      return;
    }

    if (ai.hasDrunk()) {
      ai.addInvisibleMark("drunk", 1);
    }

    return {
      fromId: ai.Id,
      cardId: skillInCard!,
      toIds: targets,
    };
  };
}

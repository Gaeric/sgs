import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import { GuDingDaoSkill } from "../../../skills";
import { TriggerSkillTriggerClass } from "../base/trigger_skill_trigger";

export class GuDingDaoSkillTrigger extends TriggerSkillTriggerClass<GuDingDaoSkill> {
  public readonly skillTrigger = (
    room: Room,
    ai: Player,
    skill: GuDingDaoSkill
  ) => ({
    fromId: ai.Id,
    invoke: skill.Name,
  });
}

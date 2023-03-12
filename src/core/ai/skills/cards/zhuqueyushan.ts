import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import { ZhuQueYuShanSkill } from "../../../skills";
import { TriggerSkillTriggerClass } from "../base/trigger_skill_trigger";

export class ZhuQueYuShanSkillTrigger extends TriggerSkillTriggerClass<ZhuQueYuShanSkill> {
  public readonly skillTrigger = (
    room: Room,
    ai: Player,
    skill: ZhuQueYuShanSkill
  ) => ({
    fromId: ai.Id,
    invoke: skill.Name,
  });
}

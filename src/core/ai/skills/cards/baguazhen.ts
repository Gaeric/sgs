import type { GameEventIdentifiers } from "../../../event/event";
import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import type { BaGuaZhenSkill } from "../../../skills";
import { TriggerSkillTriggerClass } from "../base/trigger_skill_trigger";

export class BaGuaZhenSkillTrigger extends TriggerSkillTriggerClass<
  BaGuaZhenSkill,
  GameEventIdentifiers.AskForCardUseEvent
> {
  skillTrigger = (room: Room, ai: Player, skill: BaGuaZhenSkill) => ({
    fromId: ai.Id,
    invoke: skill.Name,
  });
}

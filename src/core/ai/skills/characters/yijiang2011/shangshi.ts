import { TriggerSkillTriggerClass } from "../../base/trigger_skill_trigger";
import { Player } from "../../../../player/player";
import { Room } from "../../../../room/room";
import { ShangShi } from "../../../../skills";

export class ShangShiSkillTrigger extends TriggerSkillTriggerClass<ShangShi> {
  public readonly skillTrigger = (room: Room, ai: Player, skill: ShangShi) => ({
    fromId: ai.Id,
    invoke: skill.Name,
  });
}

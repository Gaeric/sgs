import { TriggerSkillTriggerClass } from "../../base/trigger_skill_trigger";
import { Player } from "../../../../player/player";
import { Room } from "../../../../room/room";
import { XiaoJi } from "../../../../skills";
export class XiaoJiSkillTrigger extends TriggerSkillTriggerClass<XiaoJi> {
  public readonly skillTrigger = (room: Room, ai: Player, skill: XiaoJi) => ({
    fromId: ai.Id,
    invoke: skill.Name,
  });
}

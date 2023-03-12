import { TriggerSkillTriggerClass } from "../../base/trigger_skill_trigger";
import { GameEventIdentifiers } from "../../../../event/event";
import { Player } from "../../../../player/player";
import { Room } from "../../../../room/room";
import { MiJi } from "../../../../skills";

export class MiJiSkillTrigger extends TriggerSkillTriggerClass<
  MiJi,
  GameEventIdentifiers.PhaseStageChangeEvent
> {
  public readonly skillTrigger = (room: Room, ai: Player, skill: MiJi) => ({
    fromId: ai.Id,
    invoke: skill.Name,
  });
}

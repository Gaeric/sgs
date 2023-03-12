import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { AllStage, SkillEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";
import { FeiJun } from "./feijun";

@CompulsorySkill({ name: "binglve", description: "binglve_description" })
export class BingLve extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>,
    stage?: AllStage
  ): boolean {
    return stage === SkillEffectStage.AfterSkillEffected;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): boolean {
    return (
      content.fromId === owner.Id &&
      EventPacker.getMiddleware<boolean>(FeiJun.Name, content) === true
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.drawCards(2, event.fromId, "top", event.fromId, this.Name);

    return true;
  }
}

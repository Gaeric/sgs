import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "zhuixi", description: "zhuixi_description" })
export class ZhuiXi extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ): boolean {
    return stage === DamageEffectStage.DamageEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    return (
      (content.fromId === owner.Id &&
        room.getPlayerById(content.toId).isFaceUp() !== owner.isFaceUp()) ||
      (content.fromId !== undefined &&
        content.toId === owner.Id &&
        room.getPlayerById(content.fromId).isFaceUp() !== owner.isFaceUp())
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const damageEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
    damageEvent.damage++;

    return true;
  }
}

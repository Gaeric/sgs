import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "gongqing", description: "gongqing_description" })
export class GongQing extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ): boolean {
    return stage === DamageEffectStage.DamagedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    if (!content.fromId || content.toId !== owner.Id) {
      return false;
    }

    const source = room.getPlayerById(content.fromId);
    return (
      source.getAttackRange(room) > 3 ||
      (source.getAttackRange(room) < 3 && content.damage > 1)
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

    const source = room.getPlayerById(damageEvent.fromId!);
    if (source.getAttackRange(room) > 3) {
      damageEvent.damage++;
    } else {
      damageEvent.damage = 1;
    }

    return true;
  }
}

import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { DamageType } from "../../../game/game_props";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "lianhuo", description: "lianhuo_description" })
export class LianHuo extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === DamageEffectStage.DamagedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    return (
      event.toId === owner.Id &&
      !event.isFromChainedDamage &&
      event.damageType === DamageType.Fire &&
      owner.ChainLocked
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    (
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>
    ).damage++;

    return true;
  }
}

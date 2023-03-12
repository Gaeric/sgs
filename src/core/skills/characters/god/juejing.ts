import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, PlayerDyingStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { RulesBreakerSkill, TriggerSkill } from "../../skill";
import { CompulsorySkill, ShadowSkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "juejing", description: "juejing_description" })
export class JueJing extends RulesBreakerSkill {
  public breakAdditionalCardHoldNumber(): number {
    return 2;
  }
}

@ShadowSkill
@CompulsorySkill({ name: JueJing.Name, description: JueJing.Description })
export class JueJingDying extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PlayerDyingStage.PlayerDying ||
      stage === PlayerDyingStage.AfterPlayerDying
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>
  ): boolean {
    return event.dying === owner.Id;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillEffectEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.drawCards(
      1,
      skillEffectEvent.fromId,
      "top",
      undefined,
      this.GeneralName
    );

    return true;
  }
}

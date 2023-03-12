import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  DrawCardStage,
  StagePriority,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CompulsorySkill, TriggerSkill } from "../../skill";

@CompulsorySkill({ name: "cunmu", description: "cunmu_description" })
export class CunMu extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>,
    stage?: AllStage
  ): boolean {
    return stage === DrawCardStage.BeforeDrawCardEffect;
  }

  public getPriority() {
    return StagePriority.High;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>
  ): boolean {
    return owner.Id === content.fromId;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const drawCardEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DrawCardEvent>;
    drawCardEvent.from = "bottom";

    return true;
  }
}

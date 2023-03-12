import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, PlayerDiedStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "gongao", description: "gongao_description" })
export class GongAo extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PlayerDiedStage.AfterPlayerDied;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>
  ): boolean {
    return content.playerId !== owner.Id && !owner.Dead;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.changeMaxHp(event.fromId, 1);
    await room.recover({
      toId: event.fromId,
      recoveredHp: 1,
      recoverBy: event.fromId,
    });

    return true;
  }
}

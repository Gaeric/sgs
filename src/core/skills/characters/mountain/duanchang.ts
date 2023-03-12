import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, PlayerDiedStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CompulsorySkill, TriggerSkill } from "../../skill";

@CompulsorySkill({ name: "duanchang", description: "duanchang_description" })
export class DuanChang extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PlayerDiedStage.PlayerDied && event.killedBy !== undefined;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>
  ): boolean {
    return owner.Id === event.playerId && owner.Dead;
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent } = skillUseEvent;
    const { killedBy } =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>;
    const to = room.getPlayerById(killedBy!);
    await room.loseSkill(
      to.Id,
      to
        .getPlayerSkills()
        .filter((skill) => !skill.isShadowSkill())
        .map((skill) => skill.Name),
      true
    );
    room.setFlag<boolean>(killedBy!, this.GeneralName, true, this.GeneralName);
    return true;
  }
}

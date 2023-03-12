import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { AwakeningSkill } from "../../skill_wrappers";
import { JiuShi } from "./jiushi";

@AwakeningSkill({ name: "chengzhang", description: "chengzhang_description" })
export class ChengZhang extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      event.playerId === owner.Id &&
      event.toStage === PlayerPhaseStages.PrepareStageStart &&
      room.enableToAwaken(this.Name, owner)
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillEffectEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const player = room.getPlayerById(skillEffectEvent.fromId);
    await room.recover({
      recoveredHp: 1,
      toId: skillEffectEvent.fromId,
      recoverBy: skillEffectEvent.fromId,
    });

    await room.drawCards(
      1,
      skillEffectEvent.fromId,
      "top",
      undefined,
      this.Name
    );

    player.setFlag<boolean>(JiuShi.levelUp, true);

    return true;
  }
}

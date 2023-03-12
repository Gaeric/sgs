import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";

@CommonSkill({ name: "shangjian", description: "shangjian_description" })
export class ShangJian extends TriggerSkill {
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
    const lostCardNum = room.Analytics.getLostCard(owner.Id, "round").length;
    return (
      event.toStage === PlayerPhaseStages.FinishStageStart &&
      lostCardNum > 0 &&
      lostCardNum <= owner.Hp
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.drawCards(
      room.Analytics.getLostCard(event.fromId, "round").length,
      event.fromId,
      "top",
      event.fromId,
      this.Name
    );

    return true;
  }
}

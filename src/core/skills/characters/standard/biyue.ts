import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";

@CommonSkill({ name: "biyue", description: "biyue_description" })
export class BiYue extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ) {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ) {
    return (
      owner.Id === content.playerId &&
      PlayerPhaseStages.FinishStageStart === content.toStage
    );
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    await room.drawCards(
      room
        .getPlayerById(skillUseEvent.fromId)
        .getCardIds(PlayerCardsArea.HandArea).length === 0
        ? 2
        : 1,
      skillUseEvent.fromId,
      undefined,
      skillUseEvent.fromId,
      this.Name
    );
    return true;
  }
}

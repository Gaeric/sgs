import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  DrawCardStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CompulsorySkill, TriggerSkill } from "../../skill";

@CompulsorySkill({
  name: "pve_classic_tianliang",
  description: "pve_classic_tianliang_description",
})
export class PveClassicTianLiang extends TriggerSkill {
  isRefreshAt(room: Room, owner: Player, stage: PlayerPhase) {
    return stage === PlayerPhase.PhaseBegin;
  }

  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>,
    stage?: AllStage
  ) {
    return stage === DrawCardStage.CardDrawing;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>
  ) {
    return (
      owner.Id === content.fromId &&
      owner.hasUsedSkillTimes(this.Name) < owner.MaxHp
    );
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent } = skillUseEvent;
    const drawCardEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DrawCardEvent>;
    drawCardEvent.drawAmount += 1;

    return true;
  }
}

import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";

@CommonSkill({ name: "jiang", description: "jiang_description" })
export class JiAng extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ) {
    if (!event.byCardId) {
      return false;
    }

    const card = Sanguosha.getCardById(event.byCardId);
    return (
      stage === AimStage.AfterAimmed &&
      ((card.GeneralName === "slash" && card.isRed()) ||
        card.GeneralName === "duel")
    );
  }

  canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ) {
    return event.fromId === owner.Id || event.toId === owner.Id;
  }

  async onTrigger(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    await room.drawCards(1, event.fromId, "top", event.fromId, this.Name);

    return true;
  }
}

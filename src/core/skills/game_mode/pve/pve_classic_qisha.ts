import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardUseStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({
  name: "pve_classic_qisha",
  description: "pve_classic_qisha_description",
})
export class PveClassicQiSha extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardUseStage.CardUsing;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ) {
    const card = Sanguosha.getCardById(content.cardId);
    return (
      content.fromId === owner.Id &&
      ["slash", "duel", "fire_attack", "nanmanruqing", "wanjianqifa"].includes(
        card.GeneralName
      )
    );
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const cardUseEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardUseEvent>;
    cardUseEvent.additionalDamage = cardUseEvent.additionalDamage
      ? cardUseEvent.additionalDamage++
      : 1;

    return true;
  }
}

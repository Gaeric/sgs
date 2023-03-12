import { VirtualCard } from "../../../cards/card";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";

@CommonSkill({ name: "jianxiong", description: "jianxiong_description" })
export class JianXiong extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ) {
    return stage === DamageEffectStage.AfterDamagedEffect;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ) {
    return owner.Id === content.toId;
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent } = skillUseEvent;
    const damagedEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
    if (
      damagedEvent.cardIds !== undefined &&
      VirtualCard.getActualCards(damagedEvent.cardIds).length > 0 &&
      room.isCardOnProcessing(damagedEvent.cardIds[0])
    ) {
      const { cardIds, toId } = damagedEvent;
      await room.moveCards({
        movingCards: cardIds.map((card) => ({
          card,
          fromArea: CardMoveArea.ProcessingArea,
        })),
        toId,
        moveReason: CardMoveReason.ActivePrey,
        toArea: CardMoveArea.HandArea,
      });
    }
    await room.drawCards(
      1,
      damagedEvent.toId,
      undefined,
      damagedEvent.toId,
      this.Name
    );
    return true;
  }
}

import { CardSuit } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardUseStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { MarkEnum } from "../../../shares/types/mark_list";
import { CommonSkill, TriggerSkill } from "../../skill";

@CommonSkill({ name: "hanyong", description: "hanyong_description" })
export class HanYong extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardUseStage.CardUsing;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): boolean {
    const card = Sanguosha.getCardById(content.cardId);
    return (
      content.fromId === owner.Id &&
      owner.LostHp > 0 &&
      ((card.Name === "slash" && card.Suit === CardSuit.Spade) ||
        card.GeneralName === "nanmanruqin" ||
        card.GeneralName === "wanjianqifa")
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    const cardUseEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardUseEvent>;

    cardUseEvent.additionalDamage = cardUseEvent.additionalDamage
      ? cardUseEvent.additionalDamage++
      : 1;

    if (room.getPlayerById(fromId).Hp > room.Circle) {
      room.addMark(fromId, MarkEnum.Ran, 1);
    }

    return true;
  }
}

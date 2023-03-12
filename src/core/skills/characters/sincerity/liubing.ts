import { VirtualCard } from "../../../cards/card";
import { CardSuit } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  CardUseStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "liubing", description: "liubing_description" })
export class LiuBing extends TriggerSkill {
  public audioIndex(): number {
    return 0;
  }

  public isRefreshAt(room: Room, owner: Player, stage: PlayerPhase): boolean {
    return stage === PlayerPhase.PhaseBegin;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardUseStage.AfterCardUseDeclared;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): boolean {
    const cardUsed = Sanguosha.getCardById(content.cardId);
    return (
      !owner.hasUsedSkill(this.Name) &&
      content.fromId === owner.Id &&
      cardUsed.Suit !== CardSuit.NoSuit &&
      cardUsed.GeneralName === "slash"
    );
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const cardUseEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardUseEvent>;
    const cardUsed = Sanguosha.getCardById(cardUseEvent.cardId);
    cardUseEvent.cardId = VirtualCard.create(
      {
        cardName: cardUsed.Name,
        cardSuit: CardSuit.Diamond,
        cardNumber: cardUsed.CardNumber,
        bySkill: this.Name,
      },
      [cardUseEvent.cardId]
    ).Id;

    return true;
  }
}

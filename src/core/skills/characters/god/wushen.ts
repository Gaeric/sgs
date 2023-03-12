import { Card, VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId, CardSuit } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { INFINITE_TRIGGERING_TIMES } from "../../../game/game_props";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import {
  CompulsorySkill,
  OnDefineReleaseTiming,
  RulesBreakerSkill,
  ShadowSkill,
  TransformSkill,
  TriggerSkill,
} from "../../skill";

@CompulsorySkill({ name: "wushen", description: "wushen_description" })
export class WuShen extends TransformSkill implements OnDefineReleaseTiming {
  async whenObtainingSkill(room: Room, owner: Player) {
    const cards = owner.getCardIds(PlayerCardsArea.HandArea).map((cardId) => {
      if (this.canTransform(owner, cardId, PlayerCardsArea.HandArea)) {
        return this.forceToTransformCardTo(cardId).Id;
      }

      return cardId;
    });

    owner.setupCards(PlayerCardsArea.HandArea, cards);
  }

  async whenLosingSkill(room: Room, owner: Player) {
    const cards = owner.getCardIds(PlayerCardsArea.HandArea).map((cardId) => {
      if (!Card.isVirtualCardId(cardId)) {
        return cardId;
      }

      const card = Sanguosha.getCardById<VirtualCard>(cardId);
      if (!card.findByGeneratedSkill(this.Name)) {
        return cardId;
      }

      return card.ActualCardIds[0];
    });

    owner.setupCards(PlayerCardsArea.HandArea, cards);
  }

  public canTransform(
    owner: Player,
    cardId: CardId,
    area: PlayerCardsArea.HandArea
  ): boolean {
    const card = Sanguosha.getCardById(cardId);
    return card.Suit === CardSuit.Heart && area === PlayerCardsArea.HandArea;
  }

  public forceToTransformCardTo(cardId: CardId): VirtualCard {
    const card = Sanguosha.getCardById(cardId);
    return VirtualCard.create(
      {
        cardName: "slash",
        cardNumber: card.CardNumber,
        cardSuit: CardSuit.Heart,
        bySkill: this.Name,
      },
      [cardId]
    );
  }
}

@ShadowSkill
@CompulsorySkill({ name: WuShen.Name, description: WuShen.Description })
export class WuShenShadow extends RulesBreakerSkill {
  private breakCardUsableMethod(cardId: CardId | CardMatcher): number {
    let match = false;
    if (cardId instanceof CardMatcher) {
      match = cardId.match(
        new CardMatcher({ suit: [CardSuit.Heart], generalName: ["slash"] })
      );
    } else {
      const card = Sanguosha.getCardById(cardId);
      match = card.GeneralName === "slash" && card.Suit === CardSuit.Heart;
    }

    return match ? INFINITE_TRIGGERING_TIMES : 0;
  }

  public breakCardUsableDistance(cardId: CardId | CardMatcher): number {
    return this.breakCardUsableMethod(cardId);
  }

  public breakCardUsableTimes(cardId: CardId | CardMatcher): number {
    return this.breakCardUsableMethod(cardId);
  }
}

@ShadowSkill
@CompulsorySkill({
  name: WuShenShadow.Name,
  description: WuShenShadow.Description,
})
export class WuShenDisresponse extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage: AllStage
  ): boolean {
    return stage === AimStage.AfterAim;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    const card = event.byCardId && Sanguosha.getCardById(event.byCardId);
    return (
      event.fromId === owner.Id &&
      !!card &&
      card.GeneralName === "slash" &&
      card.Suit === CardSuit.Heart
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillEffectEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const aimEvent =
      skillEffectEvent.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
    EventPacker.setDisresponsiveEvent(aimEvent);

    return true;
  }
}

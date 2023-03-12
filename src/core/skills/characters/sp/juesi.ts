import { VirtualCard } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { ActiveSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";

@CommonSkill({ name: "juesi", description: "juesi_description" })
export class JueSi extends ActiveSkill {
  public canUse(room: Room, owner: Player): boolean {
    return owner.getPlayerCards().length > 0;
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return (
      room.withinAttackDistance(
        room.getPlayerById(owner),
        room.getPlayerById(target)
      ) && room.getPlayerById(target).getPlayerCards().length > 0
    );
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return Sanguosha.getCardById(cardId).GeneralName === "slash";
  }

  public async onUse(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    if (!event.toIds || !event.cardIds) {
      return false;
    }

    await room.dropCards(
      CardMoveReason.SelfDrop,
      event.cardIds,
      event.fromId,
      event.fromId,
      this.Name
    );

    const response = await room.askForCardDrop(
      event.toIds[0],
      1,
      [PlayerCardsArea.HandArea, PlayerCardsArea.EquipArea],
      true,
      undefined,
      this.Name
    );

    if (response.droppedCards.length > 0) {
      await room.dropCards(
        CardMoveReason.SelfDrop,
        response.droppedCards,
        event.toIds[0],
        event.toIds[0],
        this.Name
      );

      const virtualDuel = VirtualCard.create({
        cardName: "duel",
        bySkill: this.Name,
      }).Id;
      Sanguosha.getCardById(response.droppedCards[0]).GeneralName !== "slash" &&
        room.getPlayerById(event.toIds[0]).Hp >=
          room.getPlayerById(event.fromId).Hp &&
        room
          .getPlayerById(event.fromId)
          .canUseCardTo(room, virtualDuel, event.toIds[0]) &&
        (await room.useCard({
          fromId: event.fromId,
          targetGroup: [event.toIds],
          cardId: virtualDuel,
        }));
    }

    return true;
  }
}

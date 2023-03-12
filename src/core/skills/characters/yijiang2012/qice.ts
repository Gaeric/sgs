import { CardType, VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { Sanguosha } from "../../../game/engine";
import { PlayerPhase } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { Precondition } from "../../../shares/libs/precondition/precondition";
import { CommonSkill, ViewAsSkill } from "../../skill";

@CommonSkill({ name: "qice", description: "qice_description" })
export class QiCe extends ViewAsSkill {
  public canViewAs(
    room: Room,
    owner: Player,
    selectedCards?: CardId[],
    cardMatcher?: CardMatcher
  ): string[] {
    return cardMatcher
      ? []
      : Sanguosha.getCardNameByType(
          (types) =>
            types.includes(CardType.Trick) &&
            !types.includes(CardType.DelayedTrick)
        );
  }

  isRefreshAt(room: Room, owner: Player, phase: PlayerPhase) {
    return phase === PlayerPhase.PlayCardStage;
  }

  public canUse(room: Room, owner: Player): boolean {
    return (
      !owner.hasUsedSkill(this.Name) &&
      owner.getCardIds(PlayerCardsArea.HandArea).length > 0 &&
      owner.canUseCard(
        room,
        new CardMatcher({
          name: Sanguosha.getCardNameByType(
            (types) =>
              types.includes(CardType.Trick) &&
              !types.includes(CardType.DelayedTrick)
          ),
        })
      )
    );
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 0;
  }

  public isAvailableCard(
    room: Room,
    owner: Player,
    pendingCardId: CardId
  ): boolean {
    return false;
  }

  public viewAs(
    selectedCards: CardId[],
    owner: Player,
    viewAs: string
  ): VirtualCard {
    Precondition.assert(!!viewAs, "Unknown qice card");
    return VirtualCard.create(
      {
        cardName: viewAs,
        bySkill: this.Name,
      },
      owner.getCardIds(PlayerCardsArea.HandArea)
    );
  }
}

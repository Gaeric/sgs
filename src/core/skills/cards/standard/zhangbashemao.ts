import { VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { Slash } from "../../../cards/standard/slash";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, ViewAsSkill } from "../../skill";

@CommonSkill({
  name: "zhangbashemao",
  description: "zhangbashemao_description",
})
export class ZhangBaSheMaoSkill extends ViewAsSkill {
  get Muted() {
    return true;
  }

  public canViewAs(): string[] {
    return ["slash"];
  }
  public canUse(room: Room, owner: Player) {
    return owner.canUseCard(room, new CardMatcher({ generalName: ["slash"] }));
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 2;
  }
  public isAvailableCard(
    room: Room,
    owner: Player,
    pendingCardId: CardId,
    selectedCards: CardId[],
    containerCard?: CardId | undefined
  ): boolean {
    return pendingCardId !== containerCard;
  }

  public availableCardAreas() {
    return [PlayerCardsArea.HandArea];
  }

  public viewAs(selectedCards: CardId[]) {
    return VirtualCard.create<Slash>(
      {
        cardName: "slash",
        bySkill: this.Name,
      },
      selectedCards
    );
  }
}

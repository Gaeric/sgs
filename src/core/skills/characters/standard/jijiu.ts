import { VirtualCard } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import { Peach } from "../../../cards/standard/peach";
import { Sanguosha } from "../../../game/engine";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CommonSkill, ViewAsSkill } from "../../skill";

@CommonSkill({ name: "jijiu", description: "jijiu_description" })
export class JiJiu extends ViewAsSkill {
  public canViewAs(): string[] {
    return ["peach"];
  }

  public canUse(room: Room, owner: Player): boolean {
    return room.CurrentPlayer !== owner;
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableCard(
    room: Room,
    owner: Player,
    pendingCardId: CardId
  ): boolean {
    return Sanguosha.getCardById(pendingCardId).isRed();
  }

  public viewAs(selectedCards: CardId[]): VirtualCard {
    return VirtualCard.create<Peach>(
      {
        cardName: "peach",
        bySkill: this.Name,
      },
      selectedCards
    );
  }
}

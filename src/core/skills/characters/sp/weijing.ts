import { VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { ViewAsSkill } from "../../skill";
import { CircleSkill, CommonSkill } from "../../skill_wrappers";

@CircleSkill
@CommonSkill({ name: "weijing", description: "weijing_description" })
export class WeiJing extends ViewAsSkill {
  public canViewAs(): string[] {
    return ["jink", "slash"];
  }

  public canUse(
    room: Room,
    owner: Player,
    event?: ServerEventFinder<GameEventIdentifiers.AskForCardUseEvent>
  ) {
    if (owner.hasUsedSkill(this.Name)) {
      return false;
    }

    const identifier = event && EventPacker.getIdentifier(event);
    if (identifier === GameEventIdentifiers.AskForCardUseEvent) {
      return (
        CardMatcher.match(
          event!.cardMatcher,
          new CardMatcher({ generalName: ["slash"] })
        ) ||
        CardMatcher.match(
          event!.cardMatcher,
          new CardMatcher({ name: ["jink"] })
        )
      );
    }

    return (
      owner.canUseCard(room, new CardMatcher({ name: ["slash"] })) &&
      identifier !== GameEventIdentifiers.AskForCardResponseEvent
    );
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 0;
  }

  public isAvailableCard(): boolean {
    return false;
  }

  public viewAs(
    selectedCards: CardId[],
    owner: Player,
    viewAs: string
  ): VirtualCard {
    return VirtualCard.create({
      cardName: viewAs,
      bySkill: this.Name,
    });
  }
}

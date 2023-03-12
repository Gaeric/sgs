import { VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { CharacterGender } from "../../../characters/character";
import {
  CardMoveReason,
  ClientEventFinder,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { ActiveSkill, CommonSkill } from "../../skill";

@CommonSkill({ name: "lijian", description: "lijian_description" })
export class LiJian extends ActiveSkill {
  public canUse(room: Room, owner: Player) {
    return !owner.hasUsedSkill(this.Name);
  }

  public numberOfTargets() {
    return 2;
  }

  cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId,
    selectedCards: CardId[],
    selectedTargets: PlayerId[]
  ): boolean {
    let canUse = room.getPlayerById(target).Gender === CharacterGender.Male;
    if (selectedTargets.length === 0) {
      canUse =
        canUse &&
        room
          .getPlayerById(owner)
          .canUseCardTo(room, new CardMatcher({ name: ["duel"] }), target);
    }

    return canUse;
  }

  isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return room.canDropCard(owner, cardId);
  }

  public getAnimationSteps(
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    const { fromId, toIds } = event;
    return [
      { from: fromId, tos: [toIds![1]] },
      { from: toIds![1], tos: [toIds![0]] },
    ];
  }

  public resortTargets() {
    return false;
  }

  async onUse(
    room: Room,
    event: ClientEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    event.animation = this.getAnimationSteps(event);
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    await room.dropCards(
      CardMoveReason.SelfDrop,
      skillUseEvent.cardIds!,
      skillUseEvent.fromId,
      skillUseEvent.fromId,
      this.Name
    );
    const duel = VirtualCard.create({
      cardName: "duel",
      bySkill: this.Name,
    });

    await room.useCard({
      fromId: skillUseEvent.toIds![1],
      targetGroup: [[skillUseEvent.toIds![0]]],
      cardId: duel.Id,
    });

    return true;
  }
}

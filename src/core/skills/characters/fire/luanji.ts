import { VirtualCard } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { WanJianQiFa } from "../../../cards/standard/wanjianqifa";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardUseStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TargetGroupUtil } from "../../../shares/libs/utils/target_group";
import {
  CommonSkill,
  ShadowSkill,
  TriggerSkill,
  ViewAsSkill,
} from "../../skill";

@CommonSkill({ name: "luanji", description: "luanji_description" })
export class LuanJi extends ViewAsSkill {
  public canViewAs(): string[] {
    return ["wanjianqifa"];
  }

  public canUse(room: Room, owner: Player) {
    return (
      owner.canUseCard(room, new CardMatcher({ name: ["wanjianqifa"] })) &&
      owner.getCardIds(PlayerCardsArea.HandArea).length >= 2
    );
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 2;
  }

  public isAvailableCard(
    room: Room,
    owner: Player,
    pendingCardId: CardId,
    selectedCards: CardId[]
  ): boolean {
    if (selectedCards.length === 1) {
      const pendingCard = Sanguosha.getCardById(pendingCardId);
      const selectedCard = Sanguosha.getCardById(selectedCards[0]);

      return (
        owner.cardFrom(pendingCardId) === PlayerCardsArea.HandArea &&
        pendingCard.Suit === selectedCard.Suit &&
        pendingCard !== selectedCard
      );
    }

    return selectedCards.length < 2;
  }

  public availableCardAreas() {
    return [PlayerCardsArea.HandArea];
  }

  public viewAs(selectedCards: CardId[]) {
    return VirtualCard.create<WanJianQiFa>(
      {
        cardName: "wanjianqifa",
        bySkill: this.Name,
      },
      selectedCards
    );
  }
}

@ShadowSkill
@CommonSkill({ name: LuanJi.GeneralName, description: LuanJi.Description })
export class LuanJiShadow extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>,
    stage: AllStage
  ): boolean {
    return stage === CardUseStage.AfterCardTargetDeclared;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): boolean {
    if (owner.getFlag<PlayerId[]>(this.GeneralName) !== undefined) {
      room.removeFlag(owner.Id, this.GeneralName);
    }

    const canUse =
      owner === room.getPlayerById(event.fromId) &&
      Sanguosha.getCardById(event.cardId).GeneralName === "wanjianqifa" &&
      event.targetGroup !== undefined &&
      event.targetGroup.length > 1;
    if (canUse) {
      room.setFlag<string[]>(
        owner.Id,
        this.GeneralName,
        TargetGroupUtil.getRealTargets(event.targetGroup)
      );
    }

    return canUse;
  }

  public targetFilter(room: Room, owner: Player, targets: PlayerId[]): boolean {
    return targets.length === 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    const toIds = room
      .getPlayerById(owner)
      .getFlag<PlayerId[]>(this.GeneralName);
    return toIds.includes(target);
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { triggeredOnEvent, toIds } = event;
    const cardUseEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardUseEvent>;
    TargetGroupUtil.removeTarget(cardUseEvent.targetGroup!, toIds![0]);

    return true;
  }
}

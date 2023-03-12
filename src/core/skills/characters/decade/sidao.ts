import { VirtualCard } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  CardUseStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { Algorithm } from "../../../shares/libs/algorithm";
import { TargetGroupUtil } from "../../../shares/libs/utils/target_group";
import { ActiveSkill, TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "sidao", description: "sidao_description" })
export class SiDao extends TriggerSkill {
  public isRefreshAt(room: Room, owner: Player, stage: PlayerPhase) {
    return stage === PlayerPhase.PlayCardStage;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardUseStage.CardUseFinishedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): boolean {
    if (
      !(
        content.fromId === owner.Id &&
        room.CurrentPhasePlayer === owner &&
        room.CurrentPlayerPhase === PlayerPhase.PlayCardStage &&
        !owner.hasUsedSkill(this.Name)
      )
    ) {
      return false;
    }

    const record = room.Analytics.getCardUseRecord(owner.Id, "phase");
    if (record.length < 2) {
      return false;
    }

    const targets = Algorithm.intersection(
      TargetGroupUtil.getRealTargets(record[record.length - 1].targetGroup),
      TargetGroupUtil.getRealTargets(record[record.length - 2].targetGroup)
    );

    const index = targets.findIndex((target) => target === owner.Id);
    index !== -1 && targets.splice(index, 1);
    if (targets.length > 0) {
      room.setFlag<PlayerId[]>(owner.Id, this.Name, targets);
      return true;
    } else {
      return false;
    }
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return room
      .getPlayerById(owner)
      .canUseCard(
        room,
        VirtualCard.create(
          { cardName: "shunshouqianyang", bySkill: this.Name },
          [cardId]
        ).Id
      );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId,
    selectedCards: CardId[]
  ): boolean {
    if (
      selectedCards.length === 0 ||
      !room.getFlag<PlayerId[]>(owner, this.Name)?.includes(target)
    ) {
      return false;
    }

    const virtualCard = VirtualCard.create(
      { cardName: "shunshouqianyang", bySkill: this.Name },
      [selectedCards[0]]
    );
    return (virtualCard.Skill as ActiveSkill).isAvailableTarget(
      owner,
      room,
      target,
      selectedCards,
      [target],
      virtualCard.Id
    );
  }

  public availableCardAreas() {
    return [PlayerCardsArea.HandArea];
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to use a card as ShunShouQianYang to one of them?",
      this.Name
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    if (!event.toIds || !event.cardIds) {
      return false;
    }

    await room.useCard({
      fromId: event.fromId,
      targetGroup: [event.toIds],
      cardId: VirtualCard.create(
        { cardName: "shunshouqianyang", bySkill: this.Name },
        event.cardIds
      ).Id,
    });

    return true;
  }
}

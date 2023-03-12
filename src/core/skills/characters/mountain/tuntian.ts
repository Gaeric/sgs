import { CardSuit } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardMoveStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import {
  CommonSkill,
  RulesBreakerSkill,
  TriggerSkill,
} from "../../skill";
import { ShadowSkill } from "../../skill_wrappers";

@CommonSkill({ name: "tuntian", description: "tuntian_description" })
export class TunTian extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardMoveStage.AfterCardMoved;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ): boolean {
    if (room.CurrentPhasePlayer === owner) {
      return false;
    }

    return (
      content.infos.find(
        (info) =>
          owner.Id === info.fromId &&
          !(
            owner.Id === info.toId &&
            (info.toArea === PlayerCardsArea.HandArea ||
              info.toArea === PlayerCardsArea.EquipArea)
          ) &&
          info.movingCards.filter(
            (card) =>
              card.fromArea === PlayerCardsArea.HandArea ||
              card.fromArea === PlayerCardsArea.EquipArea
          ).length > 0
      ) !== undefined
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;

    const judgeEvent = await room.judge(fromId, undefined, this.Name);

    if (!room.isCardInDropStack(judgeEvent.judgeCardId)) {
      return false;
    }

    if (Sanguosha.getCardById(judgeEvent.judgeCardId).Suit !== CardSuit.Heart) {
      await room.moveCards({
        movingCards: [
          { card: judgeEvent.judgeCardId, fromArea: CardMoveArea.DropStack },
        ],
        toId: fromId,
        toArea: PlayerCardsArea.OutsideArea,
        moveReason: CardMoveReason.ActiveMove,
        toOutsideArea: this.Name,
        isOutsideAreaInPublic: true,
        proposer: fromId,
        movedByReason: this.Name,
      });
    } else if (
      Sanguosha.getCardById(judgeEvent.judgeCardId).Suit === CardSuit.Heart
    ) {
      await room.moveCards({
        movingCards: [
          { card: judgeEvent.judgeCardId, fromArea: CardMoveArea.DropStack },
        ],
        toId: fromId,
        toArea: PlayerCardsArea.HandArea,
        moveReason: CardMoveReason.ActivePrey,
        proposer: fromId,
        movedByReason: this.Name,
      });
    }

    return true;
  }
}

@ShadowSkill
@CommonSkill({ name: TunTian.Name, description: TunTian.Description })
export class TunTianShadow extends RulesBreakerSkill {
  public breakOffenseDistance(room: Room, owner: Player) {
    return owner.getCardIds(PlayerCardsArea.OutsideArea, this.GeneralName)
      .length;
  }
}

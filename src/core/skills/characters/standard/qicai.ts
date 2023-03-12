import { CardType } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { INFINITE_DISTANCE } from "../../../game/game_props";
import { CardMoveStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import {
  CompulsorySkill,
  RulesBreakerSkill,
  ShadowSkill,
  TriggerSkill,
} from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CompulsorySkill({ name: "qicai", description: "qicai_description" })
export class QiCai extends RulesBreakerSkill {
  public audioIndex(): number {
    return 0;
  }

  public breakCardUsableDistance(cardId: CardId | CardMatcher) {
    let match = false;
    if (cardId instanceof CardMatcher) {
      match = cardId.match(new CardMatcher({ type: [CardType.Trick] }));
    } else {
      const card = Sanguosha.getCardById(cardId);
      match = card.is(CardType.Trick);
    }

    if (match) {
      return INFINITE_DISTANCE;
    } else {
      return 0;
    }
  }
}

@ShadowSkill
@CompulsorySkill({ name: QiCai.Name, description: QiCai.Description })
export class QiCaiBlock extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>,
    stage: CardMoveStage
  ) {
    return stage === CardMoveStage.BeforeCardMoving;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ) {
    return (
      content.infos.find(
        (info) =>
          info.fromId === owner.Id &&
          info.moveReason === CardMoveReason.PassiveDrop &&
          info.proposer !== owner.Id &&
          info.movingCards.find(
            (cardInfo) =>
              cardInfo.fromArea === CardMoveArea.EquipArea &&
              (Sanguosha.getCardById(cardInfo.card).is(CardType.Shield) ||
                Sanguosha.getCardById(cardInfo.card).is(CardType.Precious))
          ) !== undefined
      ) !== undefined
    );
  }

  async onTrigger(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    event.translationsMessage = TranslationPack.translationJsonPatcher(
      "{0} triggered skill {1}",
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(event.fromId)
      ),
      this.Name
    ).extract();
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const moveCardEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.MoveCardEvent>;
    for (const info of moveCardEvent.infos) {
      info.movingCards = info.movingCards.filter(
        (cardInfo) =>
          !(
            cardInfo.fromArea === CardMoveArea.EquipArea &&
            (Sanguosha.getCardById(cardInfo.card).is(CardType.Shield) ||
              Sanguosha.getCardById(cardInfo.card).is(CardType.Precious))
          )
      );
    }

    moveCardEvent.infos = moveCardEvent.infos.filter(
      (info) => info.movingCards.length > 0
    );
    moveCardEvent.infos.length === 0 && EventPacker.terminate(moveCardEvent);
    return true;
  }
}

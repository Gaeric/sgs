import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  CardEffectStage,
  CardUseStage,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CompulsorySkill, TriggerSkill } from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CompulsorySkill({ name: "juxiang", description: "juxiang_description" })
export class JuXiang extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<
      GameEventIdentifiers.CardEffectEvent | GameEventIdentifiers.CardUseEvent
    >,
    stage?: AllStage
  ): boolean {
    return (
      stage === CardEffectStage.PreCardEffect ||
      stage === CardUseStage.CardUseFinishedEffect
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<
      GameEventIdentifiers.CardEffectEvent | GameEventIdentifiers.CardUseEvent
    >
  ): boolean {
    const unknownEvent = EventPacker.getIdentifier(event);
    if (unknownEvent === GameEventIdentifiers.CardEffectEvent) {
      const cardEffectEvent =
        event as ServerEventFinder<GameEventIdentifiers.CardEffectEvent>;
      return (
        cardEffectEvent.toIds !== undefined &&
        cardEffectEvent.toIds.includes(owner.Id) &&
        Sanguosha.getCardById(cardEffectEvent.cardId).GeneralName ===
          "nanmanruqing"
      );
    } else if (unknownEvent === GameEventIdentifiers.CardUseEvent) {
      const cardUseEvent =
        event as ServerEventFinder<GameEventIdentifiers.CardUseEvent>;
      return (
        Sanguosha.getCardById(cardUseEvent.cardId).GeneralName ===
          "nanmanruqing" &&
        cardUseEvent.fromId !== owner.Id &&
        room.isCardOnProcessing(cardUseEvent.cardId)
      );
    }

    return false;
  }

  public async onTrigger(
    room: Room,
    content: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    const unknownEvent = content.triggeredOnEvent as ServerEventFinder<
      GameEventIdentifiers.CardEffectEvent | GameEventIdentifiers.CardUseEvent
    >;
    const identifier = EventPacker.getIdentifier(unknownEvent);
    if (identifier === GameEventIdentifiers.CardEffectEvent) {
      const cardEffectEvent =
        unknownEvent as ServerEventFinder<GameEventIdentifiers.CardEffectEvent>;
      content.translationsMessage = TranslationPack.translationJsonPatcher(
        "{0} triggered skill {1}, nullify {2}",
        TranslationPack.patchPlayerInTranslation(
          room.getPlayerById(content.fromId)
        ),
        this.Name,
        TranslationPack.patchCardInTranslation(cardEffectEvent.cardId)
      ).extract();
    } else if (identifier === GameEventIdentifiers.CardUseEvent) {
      content.translationsMessage = TranslationPack.translationJsonPatcher(
        "{0} triggered skill {1}",
        TranslationPack.patchPlayerInTranslation(
          room.getPlayerById(content.fromId)
        ),
        this.Name
      ).extract();
    }

    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const unknownEvent = event.triggeredOnEvent as ServerEventFinder<
      GameEventIdentifiers.CardEffectEvent | GameEventIdentifiers.CardUseEvent
    >;
    const identifier = EventPacker.getIdentifier(unknownEvent);

    if (identifier === GameEventIdentifiers.CardEffectEvent) {
      const cardEffectEvent =
        unknownEvent as ServerEventFinder<GameEventIdentifiers.CardEffectEvent>;
      cardEffectEvent.nullifiedTargets?.push(event.fromId);
    } else if (identifier === GameEventIdentifiers.CardUseEvent) {
      const cardUseEvent =
        unknownEvent as ServerEventFinder<GameEventIdentifiers.CardUseEvent>;
      const { cardId } = cardUseEvent;
      const cardIds: CardId[] = [];
      cardIds.push(cardId);

      await room.moveCards({
        movingCards: cardIds.map((card) => ({
          card,
          fromArea: CardMoveArea.ProcessingArea,
        })),
        toId: event.fromId,
        moveReason: CardMoveReason.ActivePrey,
        toArea: CardMoveArea.HandArea,
      });
    }

    return true;
  }
}

import { CardType } from "../../../cards/card";
import { CardChoosingOptions } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, PlayerDyingStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "buyi", description: "buyi_description" })
export class BuYi extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PlayerDyingStage.PlayerDying;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>
  ): boolean {
    const dyingPlayer = room.getPlayerById(content.dying);
    return (
      dyingPlayer.Hp <= 0 &&
      dyingPlayer.getCardIds(PlayerCardsArea.HandArea).length > 0
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to reveal a hand card from {1} ?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(room.getPlayerById(event.dying))
    ).extract();
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const dyingEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>;
    const dyingPlayer = room.getPlayerById(dyingEvent.dying);

    const options: CardChoosingOptions = {
      [PlayerCardsArea.HandArea]: dyingPlayer.getCardIds(
        PlayerCardsArea.HandArea
      ).length,
    };

    if (event.fromId === dyingEvent.dying) {
      options[PlayerCardsArea.HandArea] = dyingPlayer.getCardIds(
        PlayerCardsArea.HandArea
      );
    }

    const chooseCardEvent = {
      fromId: event.fromId,
      toId: dyingEvent.dying,
      options,
      triggeredBySkills: [this.Name],
    };

    const response = await room.askForChoosingPlayerCard(
      chooseCardEvent,
      event.fromId,
      false,
      true
    );
    if (!response) {
      return false;
    }

    room.broadcast(GameEventIdentifiers.CardDisplayEvent, {
      displayCards: [response.selectedCard!],
      translationsMessage: TranslationPack.translationJsonPatcher(
        "{0} display hand card {1}",
        TranslationPack.patchPlayerInTranslation(dyingPlayer),
        TranslationPack.patchCardInTranslation(response.selectedCard!)
      ).extract(),
    });

    if (
      !Sanguosha.getCardById(response.selectedCard!).is(CardType.Basic) &&
      !(
        event.fromId === dyingEvent.dying &&
        !room.canDropCard(event.fromId, response.selectedCard!)
      )
    ) {
      await room.dropCards(
        CardMoveReason.SelfDrop,
        [response.selectedCard!],
        dyingEvent.dying,
        dyingEvent.dying,
        this.Name
      );

      await room.recover({
        toId: dyingEvent.dying,
        recoveredHp: 1,
        recoverBy: dyingEvent.dying,
      });
    }

    return true;
  }
}

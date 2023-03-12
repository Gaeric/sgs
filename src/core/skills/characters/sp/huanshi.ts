import { CardChoosingOptions } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, JudgeEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { FilterSkill, TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "huanshi", description: "huanshi_description" })
export class HuanShi extends TriggerSkill {
  public audioIndex(characterName?: string) {
    return characterName && this.RelatedCharacters.includes(characterName)
      ? 1
      : 2;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.JudgeEvent>,
    stage?: AllStage
  ): boolean {
    return stage === JudgeEffectStage.BeforeJudgeEffect;
  }

  public canUse(room: Room, owner: Player): boolean {
    return owner.getCardIds(PlayerCardsArea.HandArea).length > 0;
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.JudgeEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to use this skill to {1} ?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(room.getPlayerById(event.toId))
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const judgeEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.JudgeEvent>;
    const to = room.getPlayerById(judgeEvent.toId);
    const options: CardChoosingOptions = {
      [PlayerCardsArea.EquipArea]: to
        .getCardIds(PlayerCardsArea.EquipArea)
        .filter(
          (cardId) =>
            Sanguosha.getCardById(cardId).GeneralName !== judgeEvent.bySkill
        ),
      [PlayerCardsArea.HandArea]: to.getCardIds(PlayerCardsArea.HandArea),
    };

    const chooseCardEvent = {
      fromId: judgeEvent.toId,
      toId: event.fromId,
      options,
      triggeredBySkills: [this.Name],
    };

    const response = await room.askForChoosingPlayerCard(
      chooseCardEvent,
      judgeEvent.toId,
      false,
      true
    );
    if (
      !response ||
      room
        .getPlayerById(event.fromId)
        .getSkills<FilterSkill>("filter")
        .find(
          (skill) =>
            !skill.canUseCard(
              response.selectedCard!,
              room,
              event.fromId,
              undefined,
              true
            )
        ) === undefined
    ) {
      return false;
    }

    const selectedCard = response.selectedCard!;
    await room.responseCard({
      cardId: selectedCard,
      fromId: event.fromId,
      translationsMessage: TranslationPack.translationJsonPatcher(
        "{0} responsed card {1} to replace judge card {2}",
        TranslationPack.patchPlayerInTranslation(
          room.getPlayerById(event.fromId)
        ),
        TranslationPack.patchCardInTranslation(selectedCard),
        TranslationPack.patchCardInTranslation(judgeEvent.judgeCardId)
      ).extract(),
      mute: true,
    });

    room.moveCards({
      movingCards: [
        { card: judgeEvent.judgeCardId, fromArea: CardMoveArea.ProcessingArea },
      ],
      toArea: CardMoveArea.DropStack,
      moveReason: CardMoveReason.PlaceToDropStack,
      proposer: event.fromId,
      movedByReason: this.Name,
    });
    room.endProcessOnTag(judgeEvent.judgeCardId.toString());

    judgeEvent.judgeCardId = selectedCard;
    room.addProcessingCards(judgeEvent.judgeCardId.toString(), selectedCard);

    return true;
  }
}

import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { AllStage, JudgeEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, FilterSkill, TriggerSkill } from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "guicai", description: "guicai_description" })
export class GuiCai extends TriggerSkill {
  public get RelatedCharacters(): string[] {
    return ["god_simayi"];
  }

  public audioIndex(characterName?: string) {
    return characterName && this.RelatedCharacters.includes(characterName)
      ? 1
      : 2;
  }

  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.JudgeEvent>,
    stage?: AllStage
  ) {
    return stage === JudgeEffectStage.BeforeJudgeEffect;
  }

  canUse(room: Room, owner: Player) {
    return owner.getPlayerCards().length > 0;
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }
  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return (
      room
        .getPlayerById(owner)
        .getSkills<FilterSkill>("filter")
        .find(
          (skill) => !skill.canUseCard(cardId, room, owner, undefined, true)
        ) === undefined
    );
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent, cardIds } = skillUseEvent;
    const judgeEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.JudgeEvent>;

    await room.responseCard({
      cardId: cardIds![0],
      fromId: skillUseEvent.fromId,
      translationsMessage: TranslationPack.translationJsonPatcher(
        "{0} responsed card {1} to replace judge card {2}",
        TranslationPack.patchPlayerInTranslation(
          room.getPlayerById(skillUseEvent.fromId)
        ),
        TranslationPack.patchCardInTranslation(cardIds![0]),
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
      proposer: skillUseEvent.fromId,
      movedByReason: this.GeneralName,
    });
    room.endProcessOnTag(judgeEvent.judgeCardId.toString());

    judgeEvent.judgeCardId = cardIds![0];
    room.addProcessingCards(judgeEvent.judgeCardId.toString(), cardIds![0]);

    return true;
  }
}

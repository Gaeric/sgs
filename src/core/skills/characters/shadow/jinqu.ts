import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";
import { QiZhi } from "./qizhi";

@CommonSkill({ name: "jinqu", description: "jinqu_description" })
export class JinQu extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      content.playerId === owner.Id &&
      content.toStage === PlayerPhaseStages.FinishStageStart
    );
  }

  public getSkillLog(room: Room, owner: Player): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to draw 2 cards, then keep {1} hand cards?",
      this.Name,
      owner.hasUsedSkillTimes(QiZhi.Name)
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    const from = room.getPlayerById(fromId);

    await room.drawCards(2, fromId, "top", fromId, this.Name);

    const dropNum =
      from.getCardIds(PlayerCardsArea.HandArea).length -
      from.hasUsedSkillTimes(QiZhi.Name);
    if (dropNum > 0) {
      const response = await room.askForCardDrop(
        fromId,
        dropNum,
        [PlayerCardsArea.HandArea],
        true,
        undefined,
        this.Name
      );

      response.droppedCards.length > 0 &&
        (await room.dropCards(
          CardMoveReason.SelfDrop,
          response.droppedCards,
          fromId,
          fromId,
          this.Name
        ));
    }

    return true;
  }
}

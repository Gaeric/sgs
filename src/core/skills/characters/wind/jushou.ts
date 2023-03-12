import { CardType } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "jushou", description: "jushou_description" })
export class JuShou extends TriggerSkill {
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
      owner.Id === content.playerId &&
      PlayerPhaseStages.FinishStageStart === content.toStage
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.turnOver(skillUseEvent.fromId);
    await room.drawCards(4, skillUseEvent.fromId, "top", undefined, this.Name);

    const player = room.getPlayerById(skillUseEvent.fromId);
    const handCards = player
      .getCardIds(PlayerCardsArea.HandArea)
      .filter((id) =>
        Sanguosha.getCardById(id).is(CardType.Equip)
          ? player.canUseCardTo(room, id, skillUseEvent.fromId)
          : room.canDropCard(skillUseEvent.fromId, id)
      );
    if (handCards.length === 0) {
      return false;
    }

    const { selectedCards } = await room.doAskForCommonly(
      GameEventIdentifiers.AskForCardEvent,
      {
        cardAmount: 1,
        toId: skillUseEvent.fromId,
        reason: this.Name,
        conversation: TranslationPack.translationJsonPatcher(
          "{0}: please choose a hand card, if it’s equipment, use it, otherwise drop it",
          this.Name
        ).extract(),
        fromArea: [PlayerCardsArea.HandArea],
        cardMatcher: new CardMatcher({ cards: handCards }).toSocketPassenger(),
        triggeredBySkills: [this.Name],
      },
      skillUseEvent.fromId,
      true
    );

    const card = Sanguosha.getCardById(selectedCards![0]);
    if (card.is(CardType.Equip)) {
      const cardUseEvent = {
        fromId: skillUseEvent.fromId,
        cardId: selectedCards![0],
      };
      await room.useCard(cardUseEvent);
    } else {
      await room.dropCards(
        CardMoveReason.SelfDrop,
        selectedCards!,
        skillUseEvent.fromId,
        skillUseEvent.fromId,
        this.Name
      );
    }

    return true;
  }
}

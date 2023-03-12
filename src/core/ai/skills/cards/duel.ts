import { AiLibrary } from "../../ai_lib";
import { ActiveSkillTriggerClass } from "../base/active_skill_trigger";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import type { CardId } from "../../../cards/libs/card_props";
import type {
  ClientEventFinder,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import type { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import type { Room } from "../../../room/room";
import type { DuelSkill } from "../../../skills";

export class DuelSkillTrigger extends ActiveSkillTriggerClass<DuelSkill> {
  skillTrigger = (
    room: Room,
    ai: Player,
    skill: DuelSkill,
    skillInCard?: CardId
  ): ClientEventFinder<GameEventIdentifiers.CardUseEvent> | undefined => {
    const slashes = AiLibrary.findAvailableCardsToResponse(
      room,
      ai,
      undefined,
      new CardMatcher({ generalName: ["slash"] })
    );

    const enemies = AiLibrary.sortEnemiesByRole(room, ai).filter(
      (e) =>
        skill.isAvailableTarget(ai.Id, room, e.Id, [], [], skillInCard!) &&
        (!e.hasSkill("wushuang") ||
          e.getCardIds(PlayerCardsArea.HandArea).length === 0)
    );
    if (
      enemies.length === 0 ||
      (slashes.length <= 1 && !ai.hasSkill("wushuang"))
    ) {
      return;
    }

    const targets = this.filterTargets(room, ai, skill, skillInCard!, enemies);
    if (targets.length === 0) {
      return;
    }

    return {
      fromId: ai.Id,
      cardId: skillInCard!,
      toIds: targets,
    };
  };

  onAskForCardResponseEvent = (
    content: ServerEventFinder<GameEventIdentifiers.AskForCardResponseEvent>,
    room: Room,
    availableCards: CardId[]
  ):
    | ClientEventFinder<GameEventIdentifiers.AskForCardResponseEvent>
    | undefined => {
    if (availableCards.length === 0) {
      return;
    }

    return {
      fromId: content.toId,
      cardId: availableCards[0],
    };
  };
}

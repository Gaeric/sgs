import { CardType } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import type { Player } from "../../../player/player";
import type { Room } from "../../../room/room";
import { QiLinGongSkill } from "../../../skills";
import { TriggerSkillTriggerClass } from "../base/trigger_skill_trigger";

export class QiLinGongSkillTrigger extends TriggerSkillTriggerClass<QiLinGongSkill> {
  public readonly skillTrigger = (
    room: Room,
    ai: Player,
    skill: QiLinGongSkill
  ) => ({
    fromId: ai.Id,
    invoke: skill.Name,
  });

  onAskForChoosingCardEvent(
    content: ServerEventFinder<GameEventIdentifiers.AskForChoosingCardEvent>,
    room: Room
  ) {
    const { cardIds, toId } = content;
    const cardId =
      (cardIds as CardId[]).find((card) =>
        Sanguosha.getCardById(card).is(CardType.DefenseRide)
      ) || (cardIds as CardId[])[0];
    return {
      fromId: toId,
      selectedCards: [cardId],
    };
  }
}

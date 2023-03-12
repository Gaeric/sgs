import { XiaoJiSkillTrigger } from "../../../ai/skills/characters/standard/xiaoji";
import { CardType } from "../../../cards/card";
import {
  CardMoveArea,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardMoveStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AI, CommonSkill, TriggerSkill } from "../../skill";

@AI(XiaoJiSkillTrigger)
@CommonSkill({ name: "xiaoji", description: "xiaoji_description" })
export class XiaoJi extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>,
    stage?: AllStage
  ) {
    return stage === CardMoveStage.AfterCardMoved;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ) {
    return (
      content.infos.find(
        (info) =>
          owner.Id === info.fromId &&
          info.movingCards.filter(
            (card) => card.fromArea === PlayerCardsArea.EquipArea
          ).length > 0
      ) !== undefined
    );
  }

  triggerableTimes(
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ) {
    return event.infos.reduce<number>(
      (sum, info) =>
        sum +
        info.movingCards.filter(
          (card) =>
            !Sanguosha.isVirtualCardId(card.card) &&
            Sanguosha.getCardById(card.card).is(CardType.Equip) &&
            card.fromArea === CardMoveArea.EquipArea
        ).length,
      0
    );
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    await room.drawCards(2, skillUseEvent.fromId, "top", undefined, this.Name);

    return true;
  }
}

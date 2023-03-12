import { CardType } from "../../../cards/card";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CompulsorySkill({ name: "xiangle", description: "xiangle_description" })
export class XiangLe extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ) {
    return stage === AimStage.AfterAimmed;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ) {
    return (
      content.toId === owner.Id &&
      content.byCardId !== undefined &&
      Sanguosha.getCardById(content.byCardId).GeneralName === "slash"
    );
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    const triggeredOnEvent =
      skillUseEvent.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
    const liushanId = skillUseEvent.fromId;
    const liushan = room.getPlayerById(liushanId);
    const fromId = triggeredOnEvent.fromId;
    const from = room.getPlayerById(fromId);

    const response = await room.askForCardDrop(
      fromId,
      1,
      [PlayerCardsArea.HandArea],
      false,
      from
        .getCardIds(PlayerCardsArea.HandArea)
        .filter(
          (cardId) => Sanguosha.getCardById(cardId).BaseType !== CardType.Basic
        ),
      this.Name,
      TranslationPack.translationJsonPatcher(
        "xiangle: please drop 1 basic card else this Slash will be of no effect to {0}",
        TranslationPack.patchPlayerInTranslation(liushan)
      ).extract()
    );

    if (response.droppedCards.length === 0) {
      triggeredOnEvent.nullifiedTargets.push(liushanId);
    } else {
      await room.dropCards(
        CardMoveReason.SelfDrop,
        response.droppedCards,
        fromId,
        fromId,
        this.Name
      );
    }

    return true;
  }
}

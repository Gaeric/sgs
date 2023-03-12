import {
  CardMoveArea,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { AllStage, CardMoveStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "weicheng", description: "weicheng_description" })
export class WeiCheng extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardMoveStage.AfterCardMoved;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ): boolean {
    return (
      content.infos.find(
        (info) =>
          info.fromId === owner.Id &&
          info.movingCards.find(
            (card) => card.fromArea === CardMoveArea.HandArea
          ) !== undefined &&
          info.toId !== owner.Id &&
          info.toArea === CardMoveArea.HandArea
      ) !== undefined &&
      owner.getCardIds(PlayerCardsArea.HandArea).length < owner.Hp
    );
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to draw a card?",
      this.Name
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.drawCards(1, event.fromId, "top", event.fromId, this.Name);

    return true;
  }
}

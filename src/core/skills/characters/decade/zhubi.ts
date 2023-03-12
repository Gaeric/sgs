import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardSuit } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardMoveStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "zhubi", description: "zhubi_description" })
export class ZhuBi extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === CardMoveStage.AfterCardMoved;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ): boolean {
    return !!content.infos.find(
      (info) =>
        info.toArea === CardMoveArea.DropStack &&
        [CardMoveReason.SelfDrop, CardMoveReason.PassiveDrop].includes(
          info.moveReason
        ) &&
        info.movingCards.find(
          (cardInfo) =>
            !cardInfo.asideMove &&
            Sanguosha.getCardById(cardInfo.card).Suit === CardSuit.Diamond
        )
    );
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to put a random ‘wu zhong sheng you’ on the top of draw dile?",
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
    let wuzhongCards = room.findCardsByMatcherFrom(
      new CardMatcher({ name: ["wuzhongshengyou"] })
    );
    const foundInDrawPile = wuzhongCards.length > 0;
    foundInDrawPile ||
      (wuzhongCards = room.findCardsByMatcherFrom(
        new CardMatcher({ name: ["wuzhongshengyou"] }),
        false
      ));

    if (wuzhongCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * wuzhongCards.length);
      await room.moveCards({
        movingCards: [
          {
            card: wuzhongCards[randomIndex],
            fromArea: foundInDrawPile
              ? CardMoveArea.DrawStack
              : CardMoveArea.DropStack,
          },
        ],
        toArea: CardMoveArea.DrawStack,
        moveReason: CardMoveReason.PlaceToDrawStack,
        proposer: event.fromId,
        triggeredBySkills: [this.Name],
      });
    }

    return true;
  }
}

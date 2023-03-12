import { CardType } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CharacterGender } from "../../../characters/character";
import {
  CardMoveArea,
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
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "fuzhu", description: "fuzhu_description" })
export class FuZhu extends TriggerSkill {
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
    if (
      content.playerId !== owner.Id &&
      content.toStage === PlayerPhaseStages.FinishStageStart &&
      !room.getPlayerById(content.playerId).Dead &&
      room.getPlayerById(content.playerId).Gender === CharacterGender.Male
    ) {
      const drawPile = room.findCardsByMatcherFrom(
        new CardMatcher({
          type: [CardType.Basic, CardType.Trick, CardType.Equip],
        })
      );
      const firstSlash = drawPile.find(
        (cardId) => Sanguosha.getCardById(cardId).GeneralName === "slash"
      );
      return (
        owner.Hp * 10 >= drawPile.length &&
        !!firstSlash &&
        room.canUseCardTo(
          firstSlash,
          owner,
          room.getPlayerById(content.playerId),
          true
        )
      );
    }

    return false;
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to use this skill to {1} ?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(event.playerId)
      )
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const toId = (
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
    ).playerId;
    for (let i = 0; i < room.Players.length; i++) {
      if (room.getPlayerById(toId).Dead) {
        break;
      }

      const slashs = room.findCardsByMatcherFrom(
        new CardMatcher({ generalName: ["slash"] })
      );
      if (slashs.length === 0) {
        break;
      }

      room.canUseCardTo(
        slashs[0],
        room.getPlayerById(event.fromId),
        room.getPlayerById(toId),
        true
      ) &&
        (await room.useCard({
          fromId: event.fromId,
          targetGroup: [[toId]],
          cardId: slashs[0],
          customFromArea: CardMoveArea.DrawStack,
          triggeredBySkills: [this.Name],
        }));
    }

    room.shuffle();

    return true;
  }
}

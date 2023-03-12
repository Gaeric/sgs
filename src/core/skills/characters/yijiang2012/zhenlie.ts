import { ZhenLieSkillTrigger } from "../../../ai/skills/characters/yijiang2012/zhenlie";
import { CardType } from "../../../cards/card";
import { CardChoosingOptions } from "../../../cards/libs/card_props";
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
import { AI, CommonSkill, TriggerSkill } from "../../skill";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@AI(ZhenLieSkillTrigger)
@CommonSkill({ name: "zhenlie", description: "zhenlie_description" })
export class ZhenLie extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ): boolean {
    if (!event.byCardId) {
      return false;
    }

    const card = Sanguosha.getCardById(event.byCardId);
    return (
      stage === AimStage.AfterAimmed &&
      (card.GeneralName === "slash" ||
        (card.is(CardType.Trick) && !card.is(CardType.DelayedTrick)))
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    return event.toId === owner.Id && event.fromId !== owner.Id && owner.Hp > 0;
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to lose 1 hp to nullify {1}, then drop a card from {2}",
      this.Name,
      TranslationPack.patchCardInTranslation(event.byCardId!),
      TranslationPack.patchPlayerInTranslation(room.getPlayerById(event.fromId))
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId, triggeredOnEvent } = event;
    const aimEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;

    await room.loseHp(fromId, 1);
    aimEvent.nullifiedTargets.push(fromId);

    if (aimEvent.fromId) {
      const user = room.getPlayerById(aimEvent.fromId);
      if (user.getPlayerCards().length < 1 || room.getPlayerById(fromId).Dead) {
        return false;
      }

      const options: CardChoosingOptions = {
        [PlayerCardsArea.EquipArea]: user.getCardIds(PlayerCardsArea.EquipArea),
        [PlayerCardsArea.HandArea]: user.getCardIds(PlayerCardsArea.HandArea)
          .length,
      };

      const chooseCardEvent = {
        fromId,
        toId: aimEvent.fromId,
        options,
        triggeredBySkills: [this.Name],
      };

      const response = await room.askForChoosingPlayerCard(
        chooseCardEvent,
        fromId,
        true,
        true
      );
      if (!response) {
        return false;
      }

      await room.dropCards(
        CardMoveReason.PassiveDrop,
        [response.selectedCard!],
        chooseCardEvent.toId,
        fromId,
        this.Name
      );
    }

    return true;
  }
}

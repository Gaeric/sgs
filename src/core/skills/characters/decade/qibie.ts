import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { AllStage, PlayerDiedStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "qibie", description: "qibie_description" })
export class QiBie extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === PlayerDiedStage.AfterPlayerDied;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>
  ): boolean {
    return !!owner
      .getCardIds(PlayerCardsArea.HandArea)
      .find((cardId) => room.canDropCard(owner.Id, cardId));
  }

  public getSkillLog(room: Room, owner: Player): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to discard all your hand cards to recover 1 hp and draw cards?",
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
    const toDiscard = room
      .getPlayerById(event.fromId)
      .getCardIds(PlayerCardsArea.HandArea)
      .filter((cardId) => room.canDropCard(event.fromId, cardId));
    if (toDiscard.length < 1) {
      return false;
    }

    await room.dropCards(
      CardMoveReason.SelfDrop,
      toDiscard,
      event.fromId,
      event.fromId,
      this.Name
    );
    await room.recover({
      toId: event.fromId,
      recoveredHp: 1,
      recoverBy: event.fromId,
    });
    await room.drawCards(
      toDiscard.length + 1,
      event.fromId,
      "top",
      event.fromId,
      this.Name
    );

    return true;
  }
}

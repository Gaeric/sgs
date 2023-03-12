import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  CardUseStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "yisuan", description: "yisuan_description" })
export class YiSuan extends TriggerSkill {
  public isRefreshAt(room: Room, owner: Player, stage: PlayerPhase) {
    return stage === PlayerPhase.PlayCardStage;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardUseStage.CardUseFinishedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): boolean {
    return (
      content.fromId === owner.Id &&
      room.CurrentPhasePlayer === owner &&
      room.CurrentPlayerPhase === PlayerPhase.PlayCardStage &&
      !owner.hasUsedSkill(this.Name) &&
      Sanguosha.getCardById(content.cardId).isCommonTrick() &&
      room.isCardOnProcessing(content.cardId)
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to lose a max hp to gain {1}?",
      this.Name,
      TranslationPack.patchCardInTranslation(event.cardId)
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.changeMaxHp(event.fromId, -1);
    await room.moveCards({
      movingCards: [
        {
          card: (
            event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardUseEvent>
          ).cardId,
          fromArea: CardMoveArea.ProcessingArea,
        },
      ],
      toId: event.fromId,
      toArea: CardMoveArea.HandArea,
      moveReason: CardMoveReason.ActiveMove,
      proposer: event.fromId,
      triggeredBySkills: [this.Name],
    });

    return true;
  }
}

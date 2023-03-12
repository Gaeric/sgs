import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "qiaoshi", description: "qiaoshi_description" })
export class QiaoShi extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      owner.Id !== event.playerId &&
      event.toStage === PlayerPhaseStages.PhaseFinishStart &&
      room.getPlayerById(event.playerId).getCardIds(PlayerCardsArea.HandArea)
        .length === owner.getCardIds(PlayerCardsArea.HandArea).length
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to draw a card with {1} ?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(event.playerId)
      )
    ).extract();
  }

  public async onTrigger(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    event.animation = [
      {
        from: event.fromId,
        tos: [
          (
            event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
          ).playerId,
        ],
      },
    ];

    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    let invoked = false;

    do {
      invoked = false;
      const toId = (
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
      ).playerId;

      const idA = (
        await room.drawCards(1, toId, "top", event.fromId, this.Name)
      )[0];
      const idB = (
        await room.drawCards(1, event.fromId, "top", event.fromId, this.Name)
      )[0];

      if (
        room.getPlayerById(event.fromId).Dead ||
        room.getPlayerById(toId).Dead
      ) {
        break;
      }

      if (Sanguosha.getCardById(idA).Suit === Sanguosha.getCardById(idB).Suit) {
        const skillUseEvent = {
          invokeSkillNames: [this.Name],
          toId: event.fromId,
          conversation: TranslationPack.translationJsonPatcher(
            "{0}: do you want to draw a card with {1} ?",
            this.Name,
            TranslationPack.patchPlayerInTranslation(room.getPlayerById(toId))
          ).extract(),
        };

        room.notify(
          GameEventIdentifiers.AskForSkillUseEvent,
          skillUseEvent,
          event.fromId
        );
        const { invoke } = await room.onReceivingAsyncResponseFrom(
          GameEventIdentifiers.AskForSkillUseEvent,
          event.fromId
        );

        invoked = !!invoke;
      }
    } while (invoked);

    return true;
  }
}

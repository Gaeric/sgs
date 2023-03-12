import { CardType } from "../../../cards/card";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { DamageType } from "../../../game/game_props";
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

@CommonSkill({ name: "langmie", description: "langmie_description" })
export class LangMie extends TriggerSkill {
  public isAutoTrigger(
    room: Room,
    owner: Player,
    event?: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      event !== undefined &&
      event.toStage === PlayerPhaseStages.FinishStageStart
    );
  }

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
    if (owner.Id === content.playerId) {
      return false;
    }

    if (content.toStage === PlayerPhaseStages.PlayCardStageEnd) {
      const types: CardType[] = [];
      let canUse = false;
      for (const record of room.Analytics.getCardUseRecord(
        content.playerId,
        "phase"
      )) {
        const type = Sanguosha.getCardById(record.cardId).BaseType;
        if (types.includes(type)) {
          canUse = true;
          break;
        }

        types.push(type);
      }

      return canUse;
    } else if (content.toStage === PlayerPhaseStages.FinishStageStart) {
      return (
        room.Analytics.getDamage(content.playerId, "round") >= 2 &&
        owner.getPlayerCards().find((id) => room.canDropCard(owner.Id, id)) !==
          undefined
      );
    }

    return false;
  }

  public async beforeUse(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    const phaseStageChangeEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>;
    if (phaseStageChangeEvent.toStage === PlayerPhaseStages.FinishStageStart) {
      const response = await room.askForCardDrop(
        event.fromId,
        1,
        [PlayerCardsArea.HandArea, PlayerCardsArea.EquipArea],
        false,
        undefined,
        this.Name,
        TranslationPack.translationJsonPatcher(
          "{0}: do you want to discard a card to deal 1 damage to {1} ?",
          this.Name,
          TranslationPack.patchPlayerInTranslation(
            room.getPlayerById(phaseStageChangeEvent.playerId)
          )
        ).extract()
      );

      if (response.droppedCards.length === 0) {
        return false;
      } else {
        event.cardIds = response.droppedCards;
      }
    }

    return true;
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): PatchedTranslationObject {
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
    if (
      (
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
      ).toStage === PlayerPhaseStages.FinishStageStart
    ) {
      await room.dropCards(
        CardMoveReason.SelfDrop,
        event.cardIds!,
        event.fromId,
        event.fromId,
        this.Name
      );

      await room.damage({
        fromId: event.fromId,
        toId: (
          event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
        ).playerId,
        damage: 1,
        damageType: DamageType.Normal,
        triggeredBySkills: [this.Name],
      });
    } else {
      await room.drawCards(1, event.fromId, "top", event.fromId, this.Name);
    }

    return true;
  }
}

import { VirtualCard } from "../../../cards/card";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { DamageType } from "../../../game/game_props";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import {
  JudgeMatcher,
  JudgeMatcherEnum,
} from "../../../shares/libs/judge_matchers";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";
import { JiBing } from "./jibing";

@CommonSkill({ name: "binghuo", description: "binghuo_description" })
export class BingHuo extends TriggerSkill {
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
    return (
      content.toStage === PlayerPhaseStages.FinishStageStart &&
      room.Analytics.getRecordEvents<
        | GameEventIdentifiers.CardUseEvent
        | GameEventIdentifiers.CardResponseEvent
      >(
        (event) =>
          (EventPacker.getIdentifier(event) ===
            GameEventIdentifiers.CardUseEvent ||
            EventPacker.getIdentifier(event) ===
              GameEventIdentifiers.CardResponseEvent) &&
          Sanguosha.getCardById(event.cardId).isVirtualCard() &&
          (
            Sanguosha.getCardById(event.cardId) as VirtualCard
          ).findByGeneratedSkill(JiBing.Name),
        undefined,
        "round",
        undefined,
        1
      ).length > 0
    );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(): boolean {
    return true;
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose a target to judge, and if the result’s color is black, you deal 1 thunder damage to the target?",
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
    if (!event.toIds) {
      return false;
    }

    const judgeEvent = await room.judge(
      event.toIds[0],
      undefined,
      this.Name,
      JudgeMatcherEnum.BingHuo
    );
    if (
      JudgeMatcher.onJudge(
        judgeEvent.judgeMatcherEnum!,
        Sanguosha.getCardById(judgeEvent.judgeCardId)
      )
    ) {
      await room.damage({
        fromId: event.fromId,
        toId: event.toIds[0],
        damage: 1,
        damageType: DamageType.Thunder,
        triggeredBySkills: [this.Name],
      });
    }

    return true;
  }
}

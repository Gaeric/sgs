import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  INFINITE_DISTANCE,
  INFINITE_TRIGGERING_TIMES,
} from "../../../game/game_props";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { RulesBreakerSkill, TriggerSkill } from "../../skill";
import { CompulsorySkill, ShadowSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CompulsorySkill({
  name: "decade_kuangcai",
  description: "decade_kuangcai_description",
})
export class DecadeKuangCai extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    if (event.playerId === owner.Id) {
      if (event.toStage === PlayerPhaseStages.DropCardStageStart) {
        const cardUseRecord = room.Analytics.getCardUseRecord(
          owner.Id,
          "round",
          undefined,
          1
        );
        return (
          cardUseRecord.length === 0 ||
          room.Analytics.getDamageRecord(owner.Id, "round", undefined, 1)
            .length === 0
        );
      } else if (event.toStage === PlayerPhaseStages.FinishStageStart) {
        return (
          room.Analytics.getDamageRecord(owner.Id, "round", undefined, 1)
            .length > 0
        );
      }
    }

    return false;
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
      ).toStage === PlayerPhaseStages.DropCardStageStart
    ) {
      room.syncGameCommonRules(event.fromId, (user) => {
        let changedNum = 0;
        if (
          room.Analytics.getCardUseRecord(event.fromId, "round", undefined, 1)
            .length === 0
        ) {
          changedNum = 1;
        } else if (
          room.Analytics.getDamageRecord(event.fromId, "round", undefined, 1)
            .length === 0
        ) {
          changedNum = -1;
        }

        let kuangcaiCount = user.getFlag<number>(this.Name) || 0;
        kuangcaiCount += changedNum;
        if (kuangcaiCount !== 0) {
          room.setFlag<number>(
            event.fromId,
            this.Name,
            kuangcaiCount,
            TranslationPack.translationJsonPatcher(
              `kuangcai: ${kuangcaiCount > 0 ? "+" : ""}{0}`,
              kuangcaiCount
            ).toString()
          );
        } else {
          room.removeFlag(event.fromId, this.Name);
        }

        room.CommonRules.addAdditionalHoldCardNumber(user, changedNum);
      });
    } else {
      await room.drawCards(
        Math.min(room.Analytics.getDamage(event.fromId, "round"), 5),
        event.fromId,
        "top",
        event.fromId,
        this.Name
      );
    }

    return true;
  }
}

@ShadowSkill
@CompulsorySkill({
  name: DecadeKuangCai.Name,
  description: DecadeKuangCai.Description,
})
export class DecadeKuangCaiShadow extends RulesBreakerSkill {
  public breakCardUsableDistance(): number {
    return INFINITE_DISTANCE;
  }

  public breakCardUsableTimes(): number {
    return INFINITE_TRIGGERING_TIMES;
  }
}

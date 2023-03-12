import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage, PlayerPhase } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import {
  JudgeMatcher,
  JudgeMatcherEnum,
} from "../../../shares/libs/judge_matchers";
import { AimGroupUtil } from "../../../shares/libs/utils/aim_group";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "xin_chijie", description: "xin_chijie_description" })
export class XinChiJie extends TriggerSkill {
  public isRefreshAt(room: Room, owner: Player, stage: PlayerPhase): boolean {
    return stage === PlayerPhase.PhaseBegin;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === AimStage.OnAimmed;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    return (
      event.fromId !== owner.Id &&
      event.toId === owner.Id &&
      !owner.hasUsedSkill(this.Name) &&
      AimGroupUtil.getAllTargets(event.allTargets).length === 1
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to use this skill to {1} which {2} used?",
      this.Name,
      TranslationPack.patchCardInTranslation(event.byCardId),
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
    const judgeEvent = await room.judge(
      event.fromId,
      undefined,
      this.Name,
      JudgeMatcherEnum.XinChiJie
    );

    JudgeMatcher.onJudge(
      judgeEvent.judgeMatcherEnum!,
      Sanguosha.getCardById(judgeEvent.judgeCardId)
    ) &&
      AimGroupUtil.cancelTarget(
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>,
        event.fromId
      );

    return true;
  }
}

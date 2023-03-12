import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { LimitSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@LimitSkill({ name: "xiangshu", description: "xiangshu_description" })
export class XiangShu extends TriggerSkill {
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
    return (
      event.playerId === owner.Id &&
      event.toStage === PlayerPhaseStages.FinishStageStart &&
      room.Analytics.getDamageRecord(owner.Id, "round", undefined, 1).length > 0
    );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return room.getPlayerById(target).LostHp > 0;
  }

  public getSkillLog(room: Room, owner: Player): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose a wounded target to recover {1} hp and draw {1} cards?",
      this.Name,
      Math.min(room.Analytics.getDamage(owner.Id, "round"), 5)
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

    const damagePoint = Math.min(
      room.Analytics.getDamage(event.fromId, "round"),
      5
    );
    await room.recover({
      toId: event.toIds[0],
      recoveredHp: damagePoint,
      recoverBy: event.fromId,
    });

    await room.drawCards(
      damagePoint,
      event.toIds[0],
      "top",
      event.fromId,
      this.Name
    );

    return true;
  }
}

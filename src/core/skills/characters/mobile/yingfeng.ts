import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { INFINITE_DISTANCE } from "../../../game/game_props";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { MarkEnum } from "../../../shares/types/mark_list";
import { GlobalRulesBreakerSkill, TriggerSkill } from "../../skill";
import { CommonSkill, ShadowSkill } from "../../skill_wrappers";

@CommonSkill({ name: "yingfeng", description: "yingfeng_description" })
export class YingFeng extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
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
      content.playerId === owner.Id &&
      content.toStage === PlayerPhaseStages.PrepareStageStart &&
      !!room.AlivePlayers.find((player) => player.getMark(MarkEnum.Feng) === 0)
    );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(owner: string, room: Room, target: string): boolean {
    return room.getPlayerById(target).getMark(MarkEnum.Feng) === 0;
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

    const fengOwner = room.AlivePlayers.find(
      (player) => player.getMark(MarkEnum.Feng) > 0
    );
    fengOwner && room.removeMark(fengOwner.Id, MarkEnum.Feng);
    room.addMark(event.toIds[0], MarkEnum.Feng, 1);

    return true;
  }
}

@ShadowSkill
@CommonSkill({ name: YingFeng.Name, description: YingFeng.Description })
export class YingFengShadow extends GlobalRulesBreakerSkill {
  public breakGlobalCardUsableDistance(
    cardId: CardId | CardMatcher,
    room: Room,
    owner: Player,
    target: Player
  ): number {
    return target.getMark(MarkEnum.Feng) > 0 ? INFINITE_DISTANCE : 0;
  }
}

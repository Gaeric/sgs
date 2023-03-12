import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { DamageType } from "../../../game/game_props";
import {
  AllStage,
  DamageEffectStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { MarkEnum } from "../../../shares/types/mark_list";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "ranshang", description: "ranshang_description" })
export class RanShang extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<
      | GameEventIdentifiers.DamageEvent
      | GameEventIdentifiers.PhaseStageChangeEvent
    >,
    stage?: AllStage
  ): boolean {
    return (
      stage === DamageEffectStage.AfterDamagedEffect ||
      stage === PhaseStageChangeStage.StageChanged
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<
      | GameEventIdentifiers.DamageEvent
      | GameEventIdentifiers.PhaseStageChangeEvent
    >
  ): boolean {
    const identifier = EventPacker.getIdentifier(content);
    if (identifier === GameEventIdentifiers.DamageEvent) {
      const damageEvent =
        content as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
      return (
        damageEvent.toId === owner.Id &&
        damageEvent.damageType === DamageType.Fire
      );
    } else if (identifier === GameEventIdentifiers.PhaseStageChangeEvent) {
      const phaseStageChangeEvent =
        content as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>;
      return (
        phaseStageChangeEvent.playerId === owner.Id &&
        phaseStageChangeEvent.toStage === PlayerPhaseStages.FinishStageStart &&
        owner.getMark(MarkEnum.Ran) > 0
      );
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
    const { fromId } = event;
    const unknownEvent = event.triggeredOnEvent as ServerEventFinder<
      | GameEventIdentifiers.DamageEvent
      | GameEventIdentifiers.PhaseStageChangeEvent
    >;

    const identifier = EventPacker.getIdentifier(unknownEvent);
    if (identifier === GameEventIdentifiers.DamageEvent) {
      const damage = (
        unknownEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>
      ).damage;
      room.addMark(fromId, MarkEnum.Ran, damage);
    } else {
      await room.loseHp(
        fromId,
        room.getPlayerById(fromId).getMark(MarkEnum.Ran)
      );
      if (room.getPlayerById(fromId).getMark(MarkEnum.Ran) > 2) {
        await room.changeMaxHp(fromId, -2);
        await room.drawCards(2, fromId, "top", fromId, this.Name);
      }
    }

    return true;
  }
}

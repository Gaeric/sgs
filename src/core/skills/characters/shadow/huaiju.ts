import {
  CardDrawReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import {
  AllStage,
  DamageEffectStage,
  DrawCardStage,
  GameBeginStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { MarkEnum } from "../../../shares/types/mark_list";
import { CompulsorySkill, TriggerSkill } from "../../skill";
import { OnDefineReleaseTiming } from "../../skill_hooks";

@CompulsorySkill({ name: "huaiju", description: "huaiju_description" })
export class HuaiJu extends TriggerSkill implements OnDefineReleaseTiming {
  public async whenLosingSkill(room: Room) {
    for (const player of room.getAlivePlayersFrom()) {
      if (player.getMark(MarkEnum.Orange) > 0) {
        room.removeMark(player.Id, MarkEnum.Orange);
      }
    }
  }

  public async whenDead(room: Room) {
    for (const player of room.getAlivePlayersFrom()) {
      if (player.getMark(MarkEnum.Orange) > 0) {
        room.removeMark(player.Id, MarkEnum.Orange);
      }
    }
  }

  public isTriggerable(
    event: ServerEventFinder<
      | GameEventIdentifiers.GameBeginEvent
      | GameEventIdentifiers.DrawCardEvent
      | GameEventIdentifiers.DamageEvent
    >,
    stage?: AllStage
  ): boolean {
    return (
      stage === GameBeginStage.AfterGameBegan ||
      stage === DrawCardStage.CardDrawing ||
      stage === DamageEffectStage.DamagedEffect
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<
      | GameEventIdentifiers.GameBeginEvent
      | GameEventIdentifiers.DrawCardEvent
      | GameEventIdentifiers.DamageEvent
    >
  ): boolean {
    const identifier = EventPacker.getIdentifier(content);
    if (identifier === GameEventIdentifiers.DrawCardEvent) {
      const drawEvent =
        content as ServerEventFinder<GameEventIdentifiers.DrawCardEvent>;
      return (
        room.getPlayerById(drawEvent.fromId).getMark(MarkEnum.Orange) > 0 &&
        room.CurrentPlayerPhase === PlayerPhase.DrawCardStage &&
        drawEvent.bySpecialReason === CardDrawReason.GameStage
      );
    } else if (identifier === GameEventIdentifiers.DamageEvent) {
      const damageEvent =
        content as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
      return room.getPlayerById(damageEvent.toId).getMark(MarkEnum.Orange) > 0;
    }

    return identifier === GameEventIdentifiers.GameBeginEvent;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId, triggeredOnEvent } = event;
    const unknownEvent = triggeredOnEvent as ServerEventFinder<
      | GameEventIdentifiers.GameBeginEvent
      | GameEventIdentifiers.DrawCardEvent
      | GameEventIdentifiers.DamageEvent
    >;

    const identifier = EventPacker.getIdentifier(unknownEvent);
    if (identifier === GameEventIdentifiers.DrawCardEvent) {
      const drawEvent =
        unknownEvent as ServerEventFinder<GameEventIdentifiers.DrawCardEvent>;
      drawEvent.drawAmount += 1;
    } else if (identifier === GameEventIdentifiers.DamageEvent) {
      const damageEvent =
        unknownEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
      room.addMark(damageEvent.toId, MarkEnum.Orange, -1);
      damageEvent.damage = 0;
      EventPacker.terminate(damageEvent);
    } else {
      room.addMark(fromId, MarkEnum.Orange, 3);
    }

    return true;
  }
}

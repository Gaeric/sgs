import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  CardMoveStage,
  DamageEffectStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { MarkEnum } from "../../../shares/types/mark_list";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "renjie", description: "renjie_description" })
export class RenJie extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<
      GameEventIdentifiers.DamageEvent | GameEventIdentifiers.MoveCardEvent
    >,
    stage?: AllStage
  ): boolean {
    return (
      stage === DamageEffectStage.AfterDamagedEffect ||
      stage === CardMoveStage.AfterCardMoved
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<
      GameEventIdentifiers.DamageEvent | GameEventIdentifiers.MoveCardEvent
    >
  ): boolean {
    const identifier = EventPacker.getIdentifier<
      GameEventIdentifiers.DamageEvent | GameEventIdentifiers.MoveCardEvent
    >(content);
    if (identifier === GameEventIdentifiers.DamageEvent) {
      return (
        (content as ServerEventFinder<GameEventIdentifiers.DamageEvent>)
          .toId === owner.Id
      );
    } else {
      const moveCardEvent =
        content as ServerEventFinder<GameEventIdentifiers.MoveCardEvent>;
      return (
        room.CurrentPlayerPhase === PlayerPhase.DropCardStage &&
        moveCardEvent.infos.find(
          (info) =>
            (info.moveReason === CardMoveReason.SelfDrop ||
              info.moveReason === CardMoveReason.PassiveDrop) &&
            info.fromId === owner.Id
        ) !== undefined
      );
    }
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { triggeredOnEvent } = skillUseEvent;
    const identifier = EventPacker.getIdentifier(triggeredOnEvent!);
    if (identifier === GameEventIdentifiers.DamageEvent) {
      const damageEvent =
        triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
      room.addMark(skillUseEvent.fromId, MarkEnum.Ren, damageEvent.damage);
    } else {
      const moveCardEvent =
        triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.MoveCardEvent>;

      let num: number = 0;
      if (moveCardEvent.infos.length === 1) {
        num += moveCardEvent.infos[0].movingCards.filter(
          (card) => !Sanguosha.isVirtualCardId(card.card)
        ).length;
      } else {
        const infos = moveCardEvent.infos.filter(
          (info) =>
            (info.moveReason === CardMoveReason.SelfDrop ||
              info.moveReason === CardMoveReason.PassiveDrop) &&
            info.fromId === skillUseEvent.fromId
        );
        for (const info of infos) {
          num += info.movingCards.filter(
            (card) => !Sanguosha.isVirtualCardId(card.card)
          ).length;
        }
      }

      room.addMark(skillUseEvent.fromId, MarkEnum.Ren, num);
    }
    return true;
  }
}

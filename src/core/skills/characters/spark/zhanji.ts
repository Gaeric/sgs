import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import {
  AllStage,
  CardMoveStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";
import { ZiShu } from "../sp/zishu";

@CompulsorySkill({ name: "zhanji", description: "zhanji_description" })
export class ZhanJi extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>,
    stage?: AllStage
  ): boolean {
    return stage === CardMoveStage.AfterCardMoved;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ): boolean {
    return (
      room.CurrentPhasePlayer === owner &&
      room.CurrentPlayerPhase === PlayerPhase.PlayCardStage &&
      content.infos.find(
        (info) =>
          info.toId === owner.Id &&
          info.toArea === CardMoveArea.HandArea &&
          info.moveReason === CardMoveReason.CardDraw &&
          info.movedByReason !== this.Name &&
          info.movedByReason !== ZiShu.Name
      ) !== undefined
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.drawCards(1, event.fromId, "top", event.fromId, this.Name);

    return true;
  }
}

import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { PlayerPhase } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "jiezi", description: "jiezi_description" })
export class JieZi extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseSkippedEvent>
  ): boolean {
    return (
      EventPacker.getIdentifier(event) ===
        GameEventIdentifiers.PhaseSkippedEvent &&
      event.skippedPhase === PlayerPhase.DrawCardStage
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PhaseSkippedEvent>
  ): boolean {
    return owner.Id !== event.playerId;
  }

  public async onTrigger(
    room: Room,
    content: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
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

import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, PlayerDiedStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { LimitSkill } from "../../skill_wrappers";

@LimitSkill({ name: "songsang", description: "songsang_description" })
export class SongSang extends TriggerSkill {
  public get RelatedSkills(): string[] {
    return ["zhanji"];
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PlayerDiedStage.PlayerDied;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>
  ): boolean {
    return content.playerId !== owner.Id;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    if (room.getPlayerById(fromId).LostHp > 0) {
      await room.recover({
        toId: fromId,
        recoveredHp: 1,
        recoverBy: fromId,
      });
    } else {
      await room.changeMaxHp(fromId, 1);
    }

    await room.obtainSkill(fromId, "zhanji");

    return true;
  }
}

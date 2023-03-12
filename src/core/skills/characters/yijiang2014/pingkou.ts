import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { DamageType } from "../../../game/game_props";
import {
  AllStage,
  PhaseChangeStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "pingkou", description: "pingkou_description" })
export class PingKou extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseChangeStage.BeforePhaseChange;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>
  ): boolean {
    if (owner.getFlag<number>(this.Name)) {
      room.removeFlag(owner.Id, this.Name);
    }

    let canUse =
      content.fromPlayer === owner.Id &&
      content.from === PlayerPhase.PhaseFinish;
    if (canUse) {
      const skipped =
        room.Analytics.getRecordEvents<GameEventIdentifiers.PhaseSkippedEvent>(
          (event) =>
            EventPacker.getIdentifier(event) ===
              GameEventIdentifiers.PhaseSkippedEvent &&
            event.playerId === owner.Id,
          owner.Id,
          "round"
        ).length;

      canUse = skipped > 0;
      canUse && room.setFlag<number>(owner.Id, this.Name, skipped);
    }

    return canUse;
  }

  public targetFilter(room: Room, owner: Player, targets: PlayerId[]): boolean {
    return (
      targets.length > 0 && targets.length <= owner.getFlag<number>(this.Name)
    );
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return owner !== target;
  }

  public getSkillLog(
    room: Room,
    owner: Player
  ): PatchedTranslationObject | string {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose at least {1} target(s) to deal 1 damage each?",
      this.Name,
      owner.getFlag<number>(this.Name)
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

    for (const toId of event.toIds) {
      await room.damage({
        fromId: event.fromId,
        toId,
        damage: 1,
        damageType: DamageType.Normal,
        triggeredBySkills: [this.Name],
      });
    }

    return true;
  }
}

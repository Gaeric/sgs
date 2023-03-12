import {
  CardDrawReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import {
  AllStage,
  DrawCardStage,
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

@CommonSkill({ name: "hongyuan", description: "hongyuan_description" })
export class HongYuan extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === DrawCardStage.CardDrawing;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>
  ): boolean {
    return (
      owner.Id === event.fromId &&
      room.CurrentPlayerPhase === PlayerPhase.DrawCardStage &&
      event.bySpecialReason === CardDrawReason.GameStage &&
      event.drawAmount > 0
    );
  }

  public numberOfTargets(): number[] {
    return [1, 2];
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return target !== owner;
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose at most two targets to draw 1 card each?",
      this.Name
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
    (
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DrawCardEvent>
    ).drawAmount -= 1;

    for (const toId of event.toIds) {
      await room.drawCards(1, toId, "top", event.fromId, this.Name);
    }

    return true;
  }
}

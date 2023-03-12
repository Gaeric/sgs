import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill, CompulsorySkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CompulsorySkill({ name: "kunfen", description: "kunfen_description" })
export class KunFen extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
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
      content.toStage === PlayerPhaseStages.FinishStageStart
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    EventPacker.addMiddleware(
      { tag: this.Name, data: true },
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers>
    );

    await room.loseHp(event.fromId, 1);

    room.getPlayerById(event.fromId).Dead ||
      (await room.drawCards(2, event.fromId, "top", event.fromId, this.Name));

    return true;
  }
}

@CommonSkill({ name: "kunfen_EX", description: "kunfen_EX_description" })
export class KunFenEX extends KunFen {
  public get GeneralName() {
    return KunFen.Name;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      content.playerId === owner.Id &&
      content.toStage === PlayerPhaseStages.FinishStageStart &&
      !EventPacker.getMiddleware<boolean>(this.GeneralName, content) &&
      owner.Hp > 0
    );
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to lose 1 hp to draw 2 cards?",
      this.Name
    ).extract();
  }
}

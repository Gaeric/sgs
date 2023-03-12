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
import { CommonSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "lianpo", description: "lianpo_description" })
export class LianPo extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PhaseStageChangeStage.AfterStageChanged &&
      event.toStage === PlayerPhaseStages.PhaseFinish
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      room.Analytics.getRecordEvents(
        (event) => {
          if (
            EventPacker.getIdentifier(event) !==
            GameEventIdentifiers.PlayerDiedEvent
          ) {
            return false;
          }
          const diedEvent =
            event as ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>;
          return diedEvent.killedBy === owner.Id;
        },
        undefined,
        "round",
        undefined,
        1
      ).length > 0
    );
  }

  public async onTrigger(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    event.translationsMessage = TranslationPack.translationJsonPatcher(
      "{0} used skill {1}",
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(event.fromId)
      ),
      this.Name
    ).extract();
    return true;
  }

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    room.insertPlayerRound(skillUseEvent.fromId);
    return true;
  }
}

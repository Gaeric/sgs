import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { AwakeningSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@AwakeningSkill({ name: "mangqing", description: "mangqing_description" })
export class MangQing extends TriggerSkill {
  public get RelatedSkills(): string[] {
    return ["yuyun"];
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PhaseStageChangeStage.StageChanged &&
      event.toStage === PlayerPhaseStages.PrepareStageStart
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      content.playerId === owner.Id && room.enableToAwaken(this.Name, owner)
    );
  }

  public async onTrigger(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    skillUseEvent.translationsMessage = TranslationPack.translationJsonPatcher(
      "{0} activated awakening skill {1}",
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(skillUseEvent.fromId)
      ),
      this.Name
    ).extract();

    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.changeMaxHp(event.fromId, 3);
    await room.recover({
      toId: event.fromId,
      recoveredHp: 3,
      recoverBy: event.fromId,
    });
    await room.loseSkill(event.fromId, "zhukou", true);
    await room.obtainSkill(event.fromId, "yuyun", true);

    return true;
  }
}

import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { AwakeningSkill, LordSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@LordSkill
@AwakeningSkill({ name: "ruoyu", description: "ruoyu_description" })
export class RuoYu extends TriggerSkill {
  public get RelatedSkills(): string[] {
    return ["jijiang", "sishu"];
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ) {
    return (
      stage === PhaseStageChangeStage.StageChanged &&
      event.toStage === PlayerPhaseStages.PrepareStageStart
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ) {
    return (
      content.playerId === owner.Id && room.enableToAwaken(this.Name, owner)
    );
  }

  async onTrigger(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    skillUseEvent.translationsMessage = TranslationPack.translationJsonPatcher(
      "{0} activated awakening skill {1}",
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(skillUseEvent.fromId)
      ),
      this.Name
    ).extract();

    return true;
  }

  async onEffect(
    room: Room,
    skillEffectEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const fromId = skillEffectEvent.fromId;

    await room.changeMaxHp(fromId, 1);
    await room.recover({
      recoveredHp: 1,
      toId: fromId,
      recoverBy: fromId,
      triggeredBySkills: [this.Name],
    });
    await room.obtainSkill(fromId, "jijiang", true);
    await room.obtainSkill(fromId, "sishu", true);

    return true;
  }
}

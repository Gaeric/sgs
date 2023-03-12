import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { AwakeningSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@AwakeningSkill({ name: "qianxin", description: "qianxin_description" })
export class QianXin extends TriggerSkill {
  public get RelatedSkills(): string[] {
    return ["jianyan"];
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ): boolean {
    return stage === DamageEffectStage.AfterDamageEffect;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ) {
    return owner.Id === content.fromId && room.enableToAwaken(this.Name, owner);
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

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    await room.changeMaxHp(skillUseEvent.fromId, -1);
    await room.obtainSkill(skillUseEvent.fromId, "jianyan", true);

    return true;
  }
}

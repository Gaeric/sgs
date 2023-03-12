import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { OnDefineReleaseTiming } from "../../skill_hooks";
import { CompulsorySkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CompulsorySkill({
  name: "baiyinshizi",
  description: "baiyinshizi_description",
})
export class BaiYinShiZiSkill
  extends TriggerSkill
  implements OnDefineReleaseTiming
{
  async whenLosingSkill(room: Room, owner: Player) {
    if (!owner.Dead && owner.isInjured()) {
      await room.recover({
        recoveredHp: 1,
        toId: owner.Id,
        triggeredBySkills: [this.Name],
      });
    }
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ) {
    return stage === DamageEffectStage.DamagedEffect;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ) {
    const damageEvent =
      content as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
    return damageEvent.toId === owner.Id && damageEvent.damage > 1;
  }

  async onTrigger(
    room: Room,
    content: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    content.translationsMessage = TranslationPack.translationJsonPatcher(
      "{0} triggered skill {1}",
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(content.fromId)
      ),
      this.Name
    ).extract();

    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { fromId } = skillUseEvent;
    const damageEvent =
      skillUseEvent.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
    damageEvent.damage = 1;
    damageEvent.messages = damageEvent.messages || [];
    damageEvent.messages.push(
      TranslationPack.translationJsonPatcher(
        "{0} triggered skill {1}, damage reduces to {2}",
        TranslationPack.patchPlayerInTranslation(room.getPlayerById(fromId)),
        this.Name,
        damageEvent.damage
      ).toString()
    );

    return true;
  }
}

import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import {
  CompulsorySkill,
  TriggerSkill,
  UniqueSkill,
} from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@UniqueSkill
@CompulsorySkill({ name: "qinggang", description: "qinggang_description" })
export class QingGangSkill extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ) {
    return (
      stage === AimStage.AfterAim &&
      event.byCardId !== undefined &&
      Sanguosha.getCardById(event.byCardId).GeneralName === "slash"
    );
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ) {
    return !!content && owner.Id === content.fromId;
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

  isRefreshAt() {
    return false;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent } = skillUseEvent;
    const aimEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
    aimEvent.triggeredBySkills = aimEvent.triggeredBySkills
      ? [...aimEvent.triggeredBySkills, this.Name]
      : [this.Name];

    return true;
  }
}

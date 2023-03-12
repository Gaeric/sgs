import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CompulsorySkill({ name: "renwangdun", description: "renwangdun_description" })
export class RenWangDunSkill extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>,
    stage?: AllStage
  ) {
    return stage === CardEffectStage.PreCardEffect;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>
  ) {
    return (
      content.toIds !== undefined &&
      content.toIds.includes(owner.Id) &&
      Sanguosha.getCardById(content.cardId).GeneralName === "slash" &&
      Sanguosha.getCardById(content.cardId).isBlack()
    );
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
    const { triggeredOnEvent } = skillUseEvent;
    const event =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardEffectEvent>;
    event.nullifiedTargets?.push(skillUseEvent.fromId);
    return true;
  }
}

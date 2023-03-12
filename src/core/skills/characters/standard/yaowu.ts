import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { CompulsorySkill, TriggerSkill } from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CompulsorySkill({ name: "yaowu", description: "yaowu_description" })
export class YaoWu extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ) {
    return stage === DamageEffectStage.DamagedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ) {
    const { fromId, toId, cardIds } = content;
    if (cardIds === undefined) {
      return false;
    }

    const card = Sanguosha.getCardById(cardIds[0]);
    if (card.isRed() && (!fromId || room.getPlayerById(fromId).Dead)) {
      return false;
    }

    return owner.Id === toId;
  }

  public async onTrigger(
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

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent } = skillUseEvent;
    const { fromId, cardIds } =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;

    if (Sanguosha.getCardById(cardIds![0]).isRed()) {
      await room.drawCards(1, fromId, "top", undefined, this.Name);
    } else {
      await room.drawCards(
        1,
        skillUseEvent.fromId,
        "top",
        undefined,
        this.Name
      );
    }

    return true;
  }
}

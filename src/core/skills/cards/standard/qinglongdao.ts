import { QingLongDaoSkillTrigger } from "../../../ai/skills/cards/qinglongdao";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, CardEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { AI, CommonSkill, TriggerSkill } from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@AI(QingLongDaoSkillTrigger)
@CommonSkill({
  name: "qinglongyanyuedao",
  description: "qinglongyanyuedao_description",
})
export class QingLongYanYueDaoSkill extends TriggerSkill {
  isAutoTrigger() {
    return true;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>,
    stage?: AllStage
  ) {
    return stage === CardEffectStage.CardEffectCancelledOut;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>
  ) {
    return (
      content.fromId === owner.Id &&
      Sanguosha.getCardById(content.cardId).GeneralName === "slash"
    );
  }

  async onTrigger(
    room: Room,
    content: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    content.translationsMessage = undefined;
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const slashEffectEvent =
      skillUseEvent.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.CardEffectEvent>;
    const from = room.getPlayerById(skillUseEvent.fromId);
    const askForSlash: ServerEventFinder<GameEventIdentifiers.AskForCardUseEvent> =
      {
        toId: slashEffectEvent.fromId!,
        scopedTargets: slashEffectEvent.toIds,
        extraUse: true,
        cardMatcher: new CardMatcher({
          generalName: ["slash"],
        }).toSocketPassenger(),
        conversation: TranslationPack.translationJsonPatcher(
          "do you want to trigger skill {0} ?",
          this.Name
        ).extract(),
        triggeredBySkills: [this.Name],
      };

    const response = await room.askForCardUse(
      askForSlash,
      slashEffectEvent.fromId!
    );
    if (response.cardId !== undefined) {
      const slashEvent: ServerEventFinder<GameEventIdentifiers.CardUseEvent> = {
        fromId: response.fromId,
        cardId: response.cardId,
        targetGroup: slashEffectEvent.toIds && [slashEffectEvent.toIds],
        extraUse: true,
        translationsMessage: TranslationPack.translationJsonPatcher(
          "{0} used skill {1}",
          TranslationPack.patchPlayerInTranslation(from),
          this.Name
        ).extract(),
        triggeredBySkills: [
          Sanguosha.getCardById(slashEffectEvent.cardId).Name,
        ],
      };

      await room.useCard(slashEvent, true);
    }

    return response.cardId !== undefined;
  }
}

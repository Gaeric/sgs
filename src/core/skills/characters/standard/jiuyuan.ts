import { CharacterNationality } from "../../../characters/character";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { LordSkill, TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "jiuyuan", description: "jiuyuan_description" })
@LordSkill
export class JiuYuan extends TriggerSkill {
  isAutoTrigger() {
    return true;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ) {
    const user = room.getPlayerById(content.fromId);
    return (
      content.byCardId !== undefined &&
      Sanguosha.getCardById(content.byCardId).GeneralName === "peach" &&
      content.toId === content.fromId &&
      user.Hp > owner.Hp &&
      user.Nationality === CharacterNationality.Wu
    );
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage: AimStage
  ) {
    return stage === AimStage.OnAim;
  }

  async onTrigger(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent } = event;
    const aimEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
    const askForInvokeSkill: ServerEventFinder<GameEventIdentifiers.AskForChoosingOptionsEvent> =
      {
        toId: aimEvent.fromId,
        options: ["yes", "no"],
        conversation: TranslationPack.translationJsonPatcher(
          "do you wanna transfer the card {0} target to {1}",
          TranslationPack.patchCardInTranslation(aimEvent.byCardId!),
          TranslationPack.patchPlayerInTranslation(
            room.getPlayerById(event.fromId)
          )
        ).extract(),
        triggeredBySkills: [this.Name],
      };
    room.notify(
      GameEventIdentifiers.AskForChoosingOptionsEvent,
      askForInvokeSkill,
      aimEvent.fromId
    );
    const { selectedOption } = await room.onReceivingAsyncResponseFrom(
      GameEventIdentifiers.AskForChoosingOptionsEvent,
      aimEvent.fromId
    );
    if (selectedOption === "yes") {
      aimEvent.toId = event.fromId;
      await room.drawCards(
        1,
        aimEvent.fromId,
        undefined,
        event.fromId,
        this.Name
      );
    }

    return true;
  }
}

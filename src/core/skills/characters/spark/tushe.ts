import { CardType } from "../../../cards/card";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AimGroupUtil } from "../../../shares/libs/utils/aim_group";
import { CommonSkill, TriggerSkill } from "../../skill";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "tushe", description: "tushe_description" })
export class TuShe extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ): boolean {
    return stage === AimStage.AfterAim;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    return (
      content.fromId === owner.Id &&
      content.isFirstTarget &&
      !Sanguosha.getCardById(content.byCardId).is(CardType.Equip) &&
      owner
        .getCardIds(PlayerCardsArea.HandArea)
        .find((id) => Sanguosha.getCardById(id).is(CardType.Basic)) ===
        undefined
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to draw {1} card(s)?",
      this.Name,
      AimGroupUtil.getAllTargets(event.allTargets).length
    ).extract();
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const num = AimGroupUtil.getAllTargets(
      (
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>
      ).allTargets
    ).length;
    await room.drawCards(num, event.fromId, "top", event.fromId, this.Name);

    return true;
  }
}

import { GuDingDaoSkillTrigger } from "../../../ai/skills/cards/gudingdao";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AI, CompulsorySkill, TriggerSkill } from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@AI(GuDingDaoSkillTrigger)
@CompulsorySkill({ name: "gudingdao", description: "gudingdao_description" })
export class GuDingDaoSkill extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === DamageEffectStage.DamageEffect &&
      event.isFromChainedDamage !== true
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    if (
      !event.cardIds ||
      Sanguosha.getCardById(event.cardIds[0]).GeneralName !== "slash"
    ) {
      return false;
    }

    return (
      event.fromId === owner.Id &&
      room.getPlayerById(event.toId).getCardIds(PlayerCardsArea.HandArea)
        .length === 0
    );
  }

  async onTrigger(): Promise<boolean> {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const damageEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
    damageEvent.damage++;
    damageEvent.messages = damageEvent.messages || [];
    damageEvent.messages.push(
      TranslationPack.translationJsonPatcher(
        "{0} used skill {1}, damage increases to {2}",
        TranslationPack.patchPlayerInTranslation(
          room.getPlayerById(event.fromId)
        ),
        this.Name,
        damageEvent.damage
      ).toString()
    );

    return true;
  }
}

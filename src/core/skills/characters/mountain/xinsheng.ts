import { CharacterId } from "../../../characters/character";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";
import { HuaShen } from "./huashen";

@CommonSkill({ name: "xinsheng", description: "xinsheng_description" })
export class XinSheng extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === DamageEffectStage.AfterDamagedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    return event.toId === owner.Id;
  }

  public triggerableTimes(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): number {
    return event.damage;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillEffectEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const player = room.getPlayerById(skillEffectEvent.fromId);
    const huashenCards = player.getCardIds<CharacterId>(
      PlayerCardsArea.OutsideArea,
      HuaShen.GeneralName
    );
    const huashen = room.getRandomCharactersFromLoadedPackage(1, huashenCards);
    if (huashen.length === 0) {
      return false;
    }

    room.setCharacterOutsideAreaCards(
      skillEffectEvent.fromId,
      HuaShen.GeneralName,
      [...huashenCards, ...huashen],
      TranslationPack.translationJsonPatcher(
        "{0} obtained character cards {1}",
        TranslationPack.patchPlayerInTranslation(player),
        TranslationPack.wrapArrayParams(
          ...huashen.map(
            (characterId) => Sanguosha.getCharacterById(characterId).Name
          )
        )
      ).extract(),
      TranslationPack.translationJsonPatcher(
        "{0} swapped {1} character cards",
        TranslationPack.patchPlayerInTranslation(player),
        huashen.length
      ).extract()
    );

    return true;
  }
}

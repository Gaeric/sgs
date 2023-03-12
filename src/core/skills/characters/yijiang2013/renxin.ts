import { CardType } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "renxin", description: "renxin_description" })
export class RenXin extends TriggerSkill {
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
    return (
      owner.Id !== content.toId && room.getPlayerById(content.toId).Hp === 1
    );
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]) {
    return cards.length === 1;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId) {
    return (
      Sanguosha.getCardById(cardId).BaseType === CardType.Equip &&
      room.canDropCard(owner, cardId)
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ) {
    return TranslationPack.translationJsonPatcher(
      "do you want to trigger skill {0} to {1} ?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(room.getPlayerById(content.toId))
    ).extract();
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { fromId, cardIds, triggeredOnEvent } = skillUseEvent;
    await room.dropCards(
      CardMoveReason.SelfDrop,
      cardIds!,
      fromId,
      fromId,
      this.Name
    );
    await room.turnOver(fromId);

    const damageEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
    EventPacker.terminate(damageEvent);

    return true;
  }
}

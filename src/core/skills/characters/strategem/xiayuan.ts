import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CircleSkill, CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CircleSkill
@CommonSkill({ name: "xiayuan", description: "xiayuan_description" })
export class XiaYuan extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === DamageEffectStage.AfterDamagedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    const losingAllArmorTag = EventPacker.getLosingAllArmorTag(content) || 0;
    return (
      losingAllArmorTag > 0 &&
      content.toId !== owner.Id &&
      !room.getPlayerById(content.toId).Dead &&
      owner.getCardIds(PlayerCardsArea.HandArea).length > 1
    );
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 2;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return room.canDropCard(owner, cardId);
  }

  public availableCardAreas(): PlayerCardsArea[] {
    return [PlayerCardsArea.HandArea];
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to discard 2 hand cards to let {1} gain {2} armor?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(room.getPlayerById(event.toId)),
      EventPacker.getLosingAllArmorTag(event)!
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    if (!event.cardIds) {
      return false;
    }

    await room.dropCards(
      CardMoveReason.SelfDrop,
      event.cardIds,
      event.fromId,
      event.fromId,
      this.Name
    );
    await room.changeArmor(
      (
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>
      ).toId,
      EventPacker.getLosingAllArmorTag(
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>
      )!
    );

    return true;
  }
}

import { ShangShiSkillTrigger } from "../../../ai/skills/characters/yijiang2011/shangshi";
import {
  CardMoveArea,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import {
  AllStage,
  CardMoveStage,
  HpChangeStage,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { AI, CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@AI(ShangShiSkillTrigger)
@CommonSkill({ name: "shangshi", description: "shangshi_description" })
export class ShangShi extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<
      | GameEventIdentifiers.MoveCardEvent
      | GameEventIdentifiers.HpChangeEvent
      | GameEventIdentifiers.ChangeMaxHpEvent
    >,
    stage?: AllStage
  ): boolean {
    return (
      stage === CardMoveStage.AfterCardMoved ||
      stage === HpChangeStage.AfterHpChange ||
      EventPacker.getIdentifier(event) === GameEventIdentifiers.ChangeMaxHpEvent
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<
      | GameEventIdentifiers.MoveCardEvent
      | GameEventIdentifiers.HpChangeEvent
      | GameEventIdentifiers.ChangeMaxHpEvent
    >
  ): boolean {
    if (owner.getCardIds(PlayerCardsArea.HandArea).length >= owner.LostHp) {
      return false;
    }

    const unknownEvent = EventPacker.getIdentifier(content);
    if (unknownEvent === GameEventIdentifiers.MoveCardEvent) {
      const event =
        content as ServerEventFinder<GameEventIdentifiers.MoveCardEvent>;
      return (
        event.infos.find(
          (info) =>
            info.fromId === owner.Id &&
            info.movingCards.find(
              (card) => card.fromArea === CardMoveArea.HandArea
            ) !== undefined
        ) !== undefined
      );
    } else if (unknownEvent === GameEventIdentifiers.HpChangeEvent) {
      const event =
        content as ServerEventFinder<GameEventIdentifiers.HpChangeEvent>;
      return event.toId === owner.Id;
    } else if (unknownEvent === GameEventIdentifiers.ChangeMaxHpEvent) {
      const event =
        content as ServerEventFinder<GameEventIdentifiers.ChangeMaxHpEvent>;
      return event.toId === owner.Id;
    }

    return false;
  }

  public getSkillLog(room: Room, owner: Player): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to draw {1} card(s)?",
      this.Name,
      owner.LostHp - owner.getCardIds(PlayerCardsArea.HandArea).length
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    const from = room.getPlayerById(fromId);
    const x = from.LostHp - from.getCardIds(PlayerCardsArea.HandArea).length;

    await room.drawCards(x, fromId, "top", fromId, this.Name);

    return true;
  }
}

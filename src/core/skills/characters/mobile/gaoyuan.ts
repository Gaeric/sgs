import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AimGroupUtil } from "../../../shares/libs/utils/aim_group";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";
import { ZhengJian } from "./zhengjian";

@CommonSkill({ name: "gaoyuan", description: "gaoyuan_description" })
export class GaoYuan extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === AimStage.OnAimmed;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    const canUse =
      content.toId === owner.Id &&
      Sanguosha.getCardById(content.byCardId).GeneralName === "slash" &&
      owner.getPlayerCards().length > 0;

    if (canUse) {
      const availableTargets = room.AlivePlayers.filter(
        (player) =>
          content.fromId !== player.Id &&
          player.getFlag<number>(ZhengJian.Name) !== undefined &&
          !AimGroupUtil.getAllTargets(content.allTargets).includes(player.Id)
      );

      if (availableTargets.length < 1) {
        return false;
      }

      room.setFlag<PlayerId[]>(
        owner.Id,
        this.Name,
        availableTargets.map((player) => player.Id)
      );
    }

    return canUse;
  }

  public numberOfTargets(): number {
    return 1;
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableTarget(owner: string, room: Room, target: string): boolean {
    return (
      room.getFlag<PlayerId[]>(owner, this.Name) &&
      room.getFlag<PlayerId[]>(owner, this.Name).includes(target)
    );
  }

  public isAvailableCard(owner: string, room: Room, cardId: CardId): boolean {
    return room.canDropCard(owner, cardId);
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to discard a card to transfer the target of slash?",
      this.Name
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    if (!event.cardIds || !event.toIds) {
      return false;
    }

    await room.dropCards(
      CardMoveReason.SelfDrop,
      event.cardIds,
      event.fromId,
      event.fromId,
      this.Name
    );
    const aimEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
    AimGroupUtil.cancelTarget(aimEvent, event.fromId);
    AimGroupUtil.addTargets(room, aimEvent, event.toIds);

    return true;
  }
}

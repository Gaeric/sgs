import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { DamageType } from "../../../game/game_props";
import {
  AllStage,
  CardResponseStage,
  CardUseStage,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import {
  ActiveSkill,
  CommonSkill,
  ShadowSkill,
  SwitchSkill,
  SwitchSkillState,
  TriggerSkill,
} from "../../skill";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";
import { MingRen } from "./mingren";

@SwitchSkill()
@CommonSkill({ name: "zhenliang", description: "zhenliang_description" })
export class ZhenLiang extends ActiveSkill {
  public canUse(room: Room, owner: Player): boolean {
    return (
      !owner.hasUsedSkill(this.Name) &&
      owner.getSwitchSkillState(this.Name, true) === SwitchSkillState.Yang
    );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId,
    selectedCards: CardId[]
  ): boolean {
    return room.withinAttackDistance(
      room.getPlayerById(owner),
      room.getPlayerById(target),
      undefined,
      selectedCards
    );
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableCard(
    owner: PlayerId,
    room: Room,
    cardId: CardId,
    selectedCards: CardId[],
    selectedTargets: PlayerId[]
  ): boolean {
    if (!room.canDropCard(owner, cardId)) {
      return false;
    }

    const ownerPlayer = room.getPlayerById(owner);
    const ren = ownerPlayer.getCardIds(
      PlayerCardsArea.OutsideArea,
      MingRen.Name
    );
    return (
      ren &&
      Sanguosha.getCardById(ren[0]).Color ===
        Sanguosha.getCardById(cardId).Color &&
      (selectedTargets.length > 0
        ? room.withinAttackDistance(
            ownerPlayer,
            room.getPlayerById(selectedTargets[0]),
            undefined,
            [cardId]
          )
        : true)
    );
  }

  public async onUse(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId, toIds, cardIds } = event;
    if (!toIds || !cardIds) {
      return false;
    }

    await room.dropCards(
      CardMoveReason.SelfDrop,
      cardIds,
      fromId,
      fromId,
      this.Name
    );

    await room.damage({
      fromId,
      toId: toIds[0],
      damage: 1,
      damageType: DamageType.Normal,
      triggeredBySkills: [this.Name],
    });

    return true;
  }
}

@ShadowSkill
@SwitchSkill()
@CommonSkill({ name: ZhenLiang.Name, description: ZhenLiang.Description })
export class ZhenLiangYin extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<
      GameEventIdentifiers.CardUseEvent | GameEventIdentifiers.CardResponseEvent
    >,
    stage?: AllStage
  ): boolean {
    return (
      stage === CardUseStage.CardUseFinishedEffect ||
      stage === CardResponseStage.AfterCardResponseEffect
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<
      GameEventIdentifiers.CardUseEvent | GameEventIdentifiers.CardResponseEvent
    >
  ): boolean {
    const ren = owner.getCardIds(PlayerCardsArea.OutsideArea, MingRen.Name);
    return (
      room.CurrentPlayer !== owner &&
      content.fromId === owner.Id &&
      owner.getSwitchSkillState(this.GeneralName, true) ===
        SwitchSkillState.Yin &&
      ren &&
      Sanguosha.getCardById(content.cardId).Color ===
        Sanguosha.getCardById(ren[0]).Color
    );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return true;
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose a target to draw a card?",
      this.Name
    ).extract();
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { fromId, toIds } = event;
    if (!toIds) {
      return false;
    }

    await room.drawCards(1, toIds[0], "top", fromId, this.GeneralName);

    return true;
  }
}

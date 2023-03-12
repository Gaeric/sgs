import { Card, VirtualCard } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  DamageEffectStage,
  HpChangeStage,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TransformSkill, TriggerSkill } from "../../skill";
import { OnDefineReleaseTiming } from "../../skill_hooks";
import {
  CompulsorySkill,
  PersistentSkill,
  ShadowSkill,
} from "../../skill_wrappers";

@CompulsorySkill({ name: "shizhi", description: "shizhi_description" })
export class ShiZhi extends TriggerSkill {
  public audioIndex(): number {
    return 0;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ): boolean {
    return stage === DamageEffectStage.AfterDamageEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    if (
      content.fromId !== owner.Id ||
      !content.cardIds ||
      content.isFromChainedDamage
    ) {
      return false;
    }

    const card = Sanguosha.getCardById(content.cardIds[0]);
    return (
      card.isVirtualCard() &&
      (card as VirtualCard).findByGeneratedSkill(this.GeneralName)
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.recover({
      toId: event.fromId,
      recoveredHp: 1,
      recoverBy: event.fromId,
    });

    return true;
  }
}

@ShadowSkill
@CompulsorySkill({
  name: "s_shizhi_transform",
  description: "s_shizhi_transform_description",
})
export class ShiZhiTransform
  extends TransformSkill
  implements OnDefineReleaseTiming
{
  async whenObtainingSkill(room: Room, owner: Player) {
    const cards = owner.getCardIds(PlayerCardsArea.HandArea).map((cardId) => {
      if (this.canTransform(owner, cardId)) {
        return this.forceToTransformCardTo(cardId).Id;
      }

      return cardId;
    });

    owner.setupCards(PlayerCardsArea.HandArea, cards);
  }

  async whenLosingSkill(room: Room, owner: Player) {
    const cards = owner.getCardIds(PlayerCardsArea.HandArea).map((cardId) => {
      if (!Card.isVirtualCardId(cardId)) {
        return cardId;
      }

      const card = Sanguosha.getCardById<VirtualCard>(cardId);
      if (!card.findByGeneratedSkill(ShiZhi.Name)) {
        return cardId;
      }

      return card.ActualCardIds[0];
    });

    owner.setupCards(PlayerCardsArea.HandArea, cards);
  }

  public canTransform(owner: Player, cardId: CardId): boolean {
    const card = Sanguosha.getCardById(cardId);
    return owner.Hp === 1 && card.GeneralName === "jink";
  }

  public includesJudgeCard(): boolean {
    return true;
  }

  public forceToTransformCardTo(cardId: CardId): VirtualCard {
    return VirtualCard.create(
      {
        cardName: "slash",
        bySkill: ShiZhi.Name,
      },
      [cardId]
    );
  }
}

@ShadowSkill
@PersistentSkill()
@CompulsorySkill({ name: ShiZhi.Name, description: ShiZhi.Description })
export class ShiZhiShadow extends TriggerSkill {
  public isFlaggedSkill(): boolean {
    return true;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.HpChangeEvent>,
    stage?: AllStage
  ): boolean {
    return stage === HpChangeStage.AfterHpChange;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.HpChangeEvent>
  ): boolean {
    return (
      content.toId === owner.Id &&
      ((owner.Hp === 1 && !owner.hasShadowSkill(ShiZhiTransform.Name)) ||
        (owner.Hp !== 1 && owner.hasShadowSkill(ShiZhiTransform.Name)))
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const from = room.getPlayerById(event.fromId);

    if (from.Hp === 1) {
      await room.obtainSkill(event.fromId, ShiZhiTransform.Name);
    } else {
      await room.loseSkill(event.fromId, ShiZhiTransform.Name);
    }

    return true;
  }
}

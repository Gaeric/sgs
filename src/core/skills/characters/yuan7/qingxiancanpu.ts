import { CardType } from "../../../cards/card";
import { CardMatcher } from "../../../cards/libs/card_matcher";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  DamageEffectStage,
  RecoverEffectStage,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "jixian", description: "jixian_description" })
export class JiXian extends TriggerSkill {
  public audioIndex(): number {
    return 1;
  }

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
    if (
      content.toId !== owner.Id ||
      room.AlivePlayers.find((player) => player.Dying)
    ) {
      return false;
    }

    const source = (
      content as ServerEventFinder<GameEventIdentifiers.DamageEvent>
    ).fromId;
    return !!source && !room.getPlayerById(source).Dead;
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to let {1} lose 1 hp and use a equip card from draw pile?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(event.fromId!)
      )
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const source = (
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>
    ).fromId!;
    await room.loseHp(source, 1);
    const equips = room.findCardsByMatcherFrom(
      new CardMatcher({ type: [CardType.Equip] })
    );
    if (equips.length > 0) {
      const randomEquip = equips[Math.floor(Math.random() * equips.length)];
      await room.useCard({
        fromId: source,
        targetGroup: [[source]],
        cardId: randomEquip,
        customFromArea: CardMoveArea.DrawStack,
      });
    }

    return true;
  }
}

@CommonSkill({ name: "liexian", description: "liexian_description" })
export class LieXian extends TriggerSkill {
  public audioIndex(): number {
    return 1;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === RecoverEffectStage.AfterRecoverEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.RecoverEvent>
  ): boolean {
    return (
      content.toId === owner.Id &&
      !room.AlivePlayers.find((player) => player.Dying)
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
    return target !== owner;
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose a target to lose 1 hp and use a equip card from draw pile?",
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
    if (!event.toIds) {
      return false;
    }

    await room.loseHp(event.toIds[0], 1);
    const equips = room.findCardsByMatcherFrom(
      new CardMatcher({ type: [CardType.Equip] })
    );
    if (equips.length > 0) {
      const randomEquip = equips[Math.floor(Math.random() * equips.length)];
      await room.useCard({
        fromId: event.toIds[0],
        targetGroup: [[event.toIds[0]]],
        cardId: randomEquip,
        customFromArea: CardMoveArea.DrawStack,
      });
    }

    return true;
  }
}

@CommonSkill({ name: "rouxian", description: "rouxian_description" })
export class RouXian extends TriggerSkill {
  public audioIndex(): number {
    return 1;
  }

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
    if (
      content.toId !== owner.Id ||
      room.AlivePlayers.find((player) => player.Dying)
    ) {
      return false;
    }

    const source = (
      content as ServerEventFinder<GameEventIdentifiers.DamageEvent>
    ).fromId;
    return (
      !!source &&
      !room.getPlayerById(source).Dead &&
      room.getPlayerById(source).LostHp > 0
    );
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to let {1} recover 1 hp and discard a equip card?",
      this.Name,
      TranslationPack.patchPlayerInTranslation(
        room.getPlayerById(event.fromId!)
      )
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const source = (
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>
    ).fromId!;
    await room.recover({
      toId: source,
      recoveredHp: 1,
      recoverBy: event.fromId,
    });

    const playerEquips = room
      .getPlayerById(source)
      .getPlayerCards()
      .filter((cardId) => Sanguosha.getCardById(cardId).is(CardType.Equip));
    if (playerEquips.length > 0) {
      const randomEquip =
        playerEquips[Math.floor(Math.random() * playerEquips.length)];
      await room.dropCards(
        CardMoveReason.SelfDrop,
        [randomEquip],
        source,
        source,
        this.Name
      );
    }

    return true;
  }
}

@CommonSkill({ name: "hexian", description: "hexian_description" })
export class HeXian extends TriggerSkill {
  public audioIndex(): number {
    return 1;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === RecoverEffectStage.AfterRecoverEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.RecoverEvent>
  ): boolean {
    return (
      content.toId === owner.Id &&
      !room.AlivePlayers.find((player) => player.Dying)
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
    return target !== owner && room.getPlayerById(target).LostHp > 0;
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose a target to recover 1 hp and discard a equip card?",
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
    if (!event.toIds) {
      return false;
    }

    await room.recover({
      toId: event.toIds[0],
      recoveredHp: 1,
      recoverBy: event.fromId,
    });

    const playerEquips = room
      .getPlayerById(event.toIds[0])
      .getPlayerCards()
      .filter((cardId) => Sanguosha.getCardById(cardId).is(CardType.Equip));
    if (playerEquips.length > 0) {
      const randomEquip =
        playerEquips[Math.floor(Math.random() * playerEquips.length)];
      await room.dropCards(
        CardMoveReason.SelfDrop,
        [randomEquip],
        event.toIds[0],
        event.toIds[0],
        this.Name
      );
    }

    return true;
  }
}

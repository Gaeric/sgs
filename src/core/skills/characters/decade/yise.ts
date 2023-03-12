import {
  CardMoveArea,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  CardMoveStage,
  DamageEffectStage,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { OnDefineReleaseTiming, TriggerSkill } from "../../skill";
import {
  CommonSkill,
  PersistentSkill,
  ShadowSkill,
} from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "yise", description: "yise_description" })
export class YiSe extends TriggerSkill {
  public isAutoTrigger(): boolean {
    return true;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === CardMoveStage.AfterCardMoved;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>
  ): boolean {
    return (
      content.infos.find(
        (info) =>
          info.fromId === owner.Id &&
          info.movingCards.find(
            (cardInfo) =>
              cardInfo.fromArea === CardMoveArea.HandArea ||
              cardInfo.fromArea === CardMoveArea.EquipArea
          ) &&
          info.toId !== undefined &&
          info.toId !== owner.Id &&
          !room.getPlayerById(info.toId).Dead &&
          info.toArea === CardMoveArea.HandArea
      ) !== undefined
    );
  }

  public async beforeUse(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    const moveCardEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.MoveCardEvent>;

    const info = moveCardEvent.infos.find(
      (info) =>
        info.fromId === fromId &&
        info.movingCards.find(
          (cardInfo) =>
            Sanguosha.getCardById(cardInfo.card).isRed() &&
            (cardInfo.fromArea === CardMoveArea.HandArea ||
              cardInfo.fromArea === CardMoveArea.EquipArea)
        ) &&
        info.toId !== undefined &&
        info.toId !== fromId &&
        room.getPlayerById(info.toId).LostHp > 0 &&
        !room.getPlayerById(info.toId).Dead &&
        info.toArea === CardMoveArea.HandArea
    );

    let invoked = false;
    if (info) {
      const response =
        await room.doAskForCommonly<GameEventIdentifiers.AskForSkillUseEvent>(
          GameEventIdentifiers.AskForSkillUseEvent,
          {
            invokeSkillNames: [this.Name],
            toId: fromId,
            conversation: TranslationPack.translationJsonPatcher(
              "{0}: do you want to let {1} recover 1 hp?",
              this.Name,
              TranslationPack.patchPlayerInTranslation(
                room.getPlayerById(info.toId!)
              )
            ).extract(),
          },
          fromId
        );

      invoked = !!response.invoke;
      response.invoke &&
        EventPacker.addMiddleware({ tag: this.Name, data: info.toId! }, event);
    }

    return (
      invoked ||
      moveCardEvent.infos.find(
        (info) =>
          info.fromId === fromId &&
          info.movingCards.find(
            (cardInfo) =>
              Sanguosha.getCardById(cardInfo.card).isBlack() &&
              (cardInfo.fromArea === CardMoveArea.HandArea ||
                cardInfo.fromArea === CardMoveArea.EquipArea)
          ) &&
          info.toId !== undefined &&
          info.toId !== fromId &&
          !room.getPlayerById(info.toId).Dead &&
          info.toArea === CardMoveArea.HandArea
      ) !== undefined
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId } = event;
    const moveCardEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.MoveCardEvent>;

    const redInfo = moveCardEvent.infos.find(
      (info) =>
        info.fromId === fromId &&
        info.movingCards.find(
          (cardInfo) =>
            Sanguosha.getCardById(cardInfo.card).isRed() &&
            (cardInfo.fromArea === CardMoveArea.HandArea ||
              cardInfo.fromArea === CardMoveArea.EquipArea)
        ) &&
        info.toId !== undefined &&
        info.toId !== fromId &&
        room.getPlayerById(info.toId).LostHp > 0 &&
        !room.getPlayerById(info.toId).Dead &&
        info.toArea === CardMoveArea.HandArea
    );

    if (redInfo) {
      await room.recover({
        toId: redInfo.toId!,
        recoveredHp: 1,
        recoverBy: fromId,
      });
    }

    const blackInfo = moveCardEvent.infos.find(
      (info) =>
        info.fromId === fromId &&
        info.movingCards.find(
          (cardInfo) =>
            Sanguosha.getCardById(cardInfo.card).isBlack() &&
            (cardInfo.fromArea === CardMoveArea.HandArea ||
              cardInfo.fromArea === CardMoveArea.EquipArea)
        ) &&
        info.toId !== undefined &&
        info.toId !== fromId &&
        !room.getPlayerById(info.toId).Dead &&
        info.toArea === CardMoveArea.HandArea
    );

    if (blackInfo) {
      let originalDMG = room.getFlag<number>(blackInfo.toId!, this.Name) || 0;
      originalDMG++;
      room.setFlag(
        blackInfo.toId!,
        this.Name,
        originalDMG,
        TranslationPack.translationJsonPatcher(
          "yise points: {0}",
          originalDMG
        ).toString()
      );

      room.getPlayerById(blackInfo.toId!).hasShadowSkill(YiSeDebuff.Name) ||
        (await room.obtainSkill(blackInfo.toId!, YiSeDebuff.Name));
    }

    return true;
  }
}

@ShadowSkill
@PersistentSkill()
@CommonSkill({
  name: "s_yise_debuff",
  description: "s_yise_debuff_description",
})
export class YiSeDebuff extends TriggerSkill implements OnDefineReleaseTiming {
  public async whenDead(room: Room, player: Player) {
    await room.loseSkill(player.Id, this.Name);
    room.removeFlag(player.Id, YiSe.Name);
  }

  public isAutoTrigger(): boolean {
    return true;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === DamageEffectStage.DamagedEffect;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    return (
      event.toId === owner.Id &&
      event.cardIds !== undefined &&
      Sanguosha.getCardById(event.cardIds[0]).GeneralName === "slash"
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const additionalDamage = room.getFlag<number>(event.fromId, YiSe.Name);
    if (additionalDamage) {
      room.removeFlag(event.fromId, YiSe.Name);
      const damageEvent =
        event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;

      damageEvent.damage += additionalDamage;
    }

    await room.loseSkill(event.fromId, this.Name);

    return true;
  }
}

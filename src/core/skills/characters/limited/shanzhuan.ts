import { CardType, VirtualCard } from "../../../cards/card";
import { CardChoosingOptions } from "../../../cards/libs/card_props";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  DamageEffectStage,
  PhaseChangeStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "shanzhuan", description: "shanzhuan_description" })
export class ShanZhuan extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<
      GameEventIdentifiers.DamageEvent | GameEventIdentifiers.PhaseChangeEvent
    >,
    stage?: AllStage
  ): boolean {
    return (
      stage === PhaseChangeStage.PhaseChanged ||
      stage === DamageEffectStage.AfterDamageEffect
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<
      GameEventIdentifiers.DamageEvent | GameEventIdentifiers.PhaseChangeEvent
    >,
    stage?: AllStage
  ): boolean {
    const identifier = EventPacker.getIdentifier(event);
    if (identifier === GameEventIdentifiers.DamageEvent) {
      const damageEvent =
        event as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
      const victim = room.getPlayerById(damageEvent.toId);
      return (
        damageEvent.fromId === owner.Id &&
        damageEvent.toId !== damageEvent.fromId &&
        !victim.Dead &&
        victim.getCardIds(PlayerCardsArea.JudgeArea).length === 0 &&
        victim.getPlayerCards().length > 0 &&
        !victim.judgeAreaDisabled()
      );
    } else if (identifier === GameEventIdentifiers.PhaseChangeEvent) {
      const phaseChangeEvent =
        event as ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>;
      return (
        phaseChangeEvent.fromPlayer === owner.Id &&
        phaseChangeEvent.from === PlayerPhase.PhaseFinish &&
        room.Analytics.getDamageRecord(owner.Id, "round", undefined, 1)
          .length === 0
      );
    }

    return false;
  }

  public getSkillLog(
    room: Room,
    owner: Player,
    event: ServerEventFinder<
      GameEventIdentifiers.DamageEvent | GameEventIdentifiers.PhaseChangeEvent
    >
  ): PatchedTranslationObject {
    const identifier = EventPacker.getIdentifier(event);
    return identifier === GameEventIdentifiers.DamageEvent
      ? TranslationPack.translationJsonPatcher(
          "{0}: do you want to put a card from {1} into his judge area?",
          this.Name,
          TranslationPack.patchPlayerInTranslation(
            room.getPlayerById(
              (event as ServerEventFinder<GameEventIdentifiers.DamageEvent>)
                .toId
            )
          )
        ).extract()
      : TranslationPack.translationJsonPatcher(
          "{0}: do you want to draw a card?",
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
    const { fromId } = event;
    const unknownEvent = event.triggeredOnEvent as ServerEventFinder<
      GameEventIdentifiers.DamageEvent | GameEventIdentifiers.PhaseChangeEvent
    >;

    const identifier = EventPacker.getIdentifier(unknownEvent);
    if (identifier === GameEventIdentifiers.DamageEvent) {
      const victim = (
        unknownEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>
      ).toId;

      const options: CardChoosingOptions = {
        [PlayerCardsArea.EquipArea]: room
          .getPlayerById(victim)
          .getCardIds(PlayerCardsArea.EquipArea),
        [PlayerCardsArea.HandArea]: room
          .getPlayerById(victim)
          .getCardIds(PlayerCardsArea.HandArea).length,
      };
      const resposne = await room.askForChoosingPlayerCard(
        {
          fromId,
          toId: victim,
          options,
          triggeredBySkills: [this.Name],
        },
        fromId,
        false,
        true
      );
      if (!resposne) {
        return false;
      }

      const realCard = Sanguosha.getCardById(
        VirtualCard.getActualCards([resposne.selectedCard!])[0]
      );
      const toMove = realCard.is(CardType.DelayedTrick)
        ? realCard.Id
        : realCard.isBlack()
        ? VirtualCard.create(
            { cardName: "bingliangcunduan", bySkill: this.Name },
            [realCard.Id]
          ).Id
        : VirtualCard.create({ cardName: "lebusishu", bySkill: this.Name }, [
            realCard.Id,
          ]).Id;

      await room.moveCards({
        movingCards: [{ card: toMove, fromArea: resposne.fromArea }],
        fromId: victim,
        toId: victim,
        toArea: CardMoveArea.JudgeArea,
        moveReason: CardMoveReason.PassiveMove,
        proposer: fromId,
        triggeredBySkills: [this.Name],
      });
    } else {
      await room.drawCards(1, fromId, "top", fromId, this.Name);
    }

    return true;
  }
}

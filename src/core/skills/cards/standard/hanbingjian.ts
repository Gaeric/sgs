import { HanBingJianSkillTrigger } from "../../../ai/skills/cards/hanbingjian";
import { CardChoosingOptions } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AI, CommonSkill, TriggerSkill } from "../../skill";

@AI(HanBingJianSkillTrigger)
@CommonSkill({ name: "hanbingjian", description: "hanbingjian_description" })
export class HanBingJianSkill extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === DamageEffectStage.DamageEffect &&
      event.isFromChainedDamage !== true
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ): boolean {
    if (
      !event.cardIds ||
      Sanguosha.getCardById(event.cardIds[0]).GeneralName !== "slash"
    ) {
      return false;
    }

    return (
      event.fromId === owner.Id &&
      room.getPlayerById(event.toId).getPlayerCards().length > 0
    );
  }

  async onTrigger(): Promise<boolean> {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { triggeredOnEvent } = event;
    const damageEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;
    const to = room.getPlayerById(damageEvent.toId);

    EventPacker.terminate(damageEvent);
    for (let i = 0; i < 2; i++) {
      if (
        (to.Id === event.fromId &&
          to.getCardIds().filter((id) => room.canDropCard(event.fromId, id))
            .length === 0) ||
        to.getPlayerCards().length === 0
      ) {
        return false;
      }

      const options: CardChoosingOptions = {
        [PlayerCardsArea.HandArea]: to.getCardIds(PlayerCardsArea.HandArea)
          .length,
        [PlayerCardsArea.EquipArea]: to.getCardIds(PlayerCardsArea.EquipArea),
      };

      const chooseCardEvent = {
        fromId: event.fromId,
        toId: to.Id,
        options,
        triggeredBySkills: [this.Name],
      };

      const response = await room.askForChoosingPlayerCard(
        chooseCardEvent,
        chooseCardEvent.fromId,
        true,
        true
      );

      if (!response) {
        return false;
      }

      await room.dropCards(
        CardMoveReason.PassiveDrop,
        [response.selectedCard!],
        chooseCardEvent.toId,
        chooseCardEvent.fromId,
        this.Name
      );
    }

    return true;
  }
}

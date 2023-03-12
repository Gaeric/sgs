import { CardId } from "../../../cards/libs/card_props";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { DamageType } from "../../../game/game_props";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({
  name: "pve_classic_tianji",
  description: "pve_classic_tianji_description",
})
export class PveClassicTianJi extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ) {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ) {
    return (
      owner.Id !== content.playerId &&
      PlayerPhaseStages.FinishStageEnd === content.toStage &&
      owner.getPlayerCards().length > 0 &&
      room.Analytics.getRecordEvents<GameEventIdentifiers.DamageEvent>(
        (event) =>
          EventPacker.getIdentifier(event) === GameEventIdentifiers.DamageEvent,
        content.playerId,
        "round",
        undefined,
        1
      ).length === 0
    );
  }

  getSkillLog() {
    return TranslationPack.translationJsonPatcher(
      "{0}: you can drop a card to deal 1 thunder damage to current player?",
      this.Name
    ).extract();
  }

  cardFilter(room: Room, owner: Player, cards: CardId[]) {
    return cards.length === 1;
  }

  isAvailableCard(owner: PlayerId, room: Room, cardId: CardId) {
    return room.canDropCard(owner, cardId);
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    if (event.cardIds !== undefined && event.cardIds.length === 1) {
      await room.dropCards(
        CardMoveReason.SelfDrop,
        event.cardIds,
        event.fromId
      );
      const current = room.CurrentPlayer;
      if (!current.Dead) {
        await room.damage({
          fromId: event.fromId,
          toId: current.Id,
          damage: 1,
          damageType: DamageType.Thunder,
          triggeredBySkills: [this.GeneralName],
        });
      }
    }

    return true;
  }
}

import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import {
  AimStage,
  AllStage,
  PhaseChangeStage,
  PlayerPhase,
  StagePriority,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { Functional } from "../../../shares/libs/functional";
import {
  CommonSkill,
  CompulsorySkill,
  PersistentSkill,
  ShadowSkill,
  TriggerSkill,
} from "../../skill";
import { OnDefineReleaseTiming } from "../../skill_hooks";
import { TranslationPack } from "../../../translations/translation_json_tool";
import { UncompulsoryBlocker } from "./uncompulsory_blocker";

@CommonSkill({ name: "tieji", description: "tieji_description" })
export class TieJi extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ) {
    return (
      stage === AimStage.AfterAim &&
      event.byCardId !== undefined &&
      Sanguosha.getCardById(event.byCardId).GeneralName === "slash"
    );
  }

  canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ) {
    return owner.Id === event.fromId;
  }

  async onTrigger(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent } = skillUseEvent;
    const aimEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
    room.setFlag(aimEvent.toId, this.Name, true, this.Name);
    room
      .getPlayerById(aimEvent.toId)
      .hasShadowSkill(UncompulsoryBlocker.Name) ||
      (await room.obtainSkill(aimEvent.toId, UncompulsoryBlocker.Name));
    const to = room.getPlayerById(aimEvent.toId);

    const judge = await room.judge(skillUseEvent.fromId, undefined, this.Name);
    const judgeCard = Sanguosha.getCardById(judge.judgeCardId);

    const response = await room.askForCardDrop(
      aimEvent.toId,
      1,
      [PlayerCardsArea.HandArea, PlayerCardsArea.EquipArea],
      false,
      to
        .getPlayerCards()
        .filter(
          (cardId) => Sanguosha.getCardById(cardId).Suit !== judgeCard.Suit
        ),
      this.Name,
      TranslationPack.translationJsonPatcher(
        "please drop a {0} card, otherwise you can't do response of slash",
        Functional.getCardSuitRawText(judgeCard.Suit)
      ).extract()
    );

    if (response.droppedCards.length === 0) {
      EventPacker.setDisresponsiveEvent(aimEvent);
    } else {
      await room.dropCards(
        CardMoveReason.SelfDrop,
        response.droppedCards,
        aimEvent.toId,
        skillUseEvent.fromId,
        this.Name
      );
    }

    return true;
  }
}

@ShadowSkill
@PersistentSkill()
@CompulsorySkill({ name: TieJi.GeneralName, description: TieJi.Description })
export class TieJiShadow extends TriggerSkill implements OnDefineReleaseTiming {
  public afterLosingSkill(
    room: Room,
    owner: PlayerId,
    content: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return (
      room.CurrentPlayerPhase === PlayerPhase.PhaseFinish &&
      stage === PhaseChangeStage.PhaseChanged
    );
  }

  public afterDead(
    room: Room,
    owner: PlayerId,
    content: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return (
      room.CurrentPlayerPhase === PlayerPhase.PhaseFinish &&
      stage === PhaseChangeStage.PhaseChanged
    );
  }

  getPriority() {
    return StagePriority.High;
  }

  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>,
    stage: PhaseChangeStage
  ) {
    return (
      stage === PhaseChangeStage.PhaseChanged &&
      event.from === PlayerPhase.PhaseFinish
    );
  }

  public isFlaggedSkill(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>,
    stage?: AllStage
  ) {
    return true;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>
  ) {
    return (
      room.AlivePlayers.find((player) =>
        player.getFlag<boolean>(this.GeneralName)
      ) !== undefined
    );
  }

  async onTrigger(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>
  ) {
    return true;
  }

  async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    for (const player of room.AlivePlayers) {
      room.removeFlag(player.Id, this.GeneralName);
      player.hasShadowSkill(UncompulsoryBlocker.Name) &&
        (await room.loseSkill(player.Id, UncompulsoryBlocker.Name));
    }
    return true;
  }
}

import { CardMatcher } from "../../../cards/libs/card_matcher";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AimGroupUtil } from "../../../shares/libs/utils/aim_group";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "qiuyuan", description: "qiuyuan_description" })
export class QiuYuan extends TriggerSkill {
  public isTriggerable(
    _: ServerEventFinder<GameEventIdentifiers>,
    stage?: AllStage
  ): boolean {
    return stage === AimStage.OnAimmed;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ): boolean {
    if (
      !!event.byCardId &&
      Sanguosha.getCardById(event.byCardId).GeneralName === "slash" &&
      event.toId === owner.Id
    ) {
      room.setFlag<PlayerId[]>(owner.Id, this.Name, [
        event.fromId,
        ...AimGroupUtil.getAllTargets(event.allTargets),
      ]);
      return true;
    }
    return false;
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    const invalidTargets = room
      .getPlayerById(owner)
      .getFlag<PlayerId[]>(this.Name);
    return !invalidTargets.includes(target);
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillEffectEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const to = room.getPlayerById(skillEffectEvent.toIds![0]);
    const from = room.getPlayerById(skillEffectEvent.fromId);

    const askForCard: ServerEventFinder<GameEventIdentifiers.AskForCardEvent> =
      {
        cardAmount: 1,
        toId: to.Id,
        fromArea: [PlayerCardsArea.HandArea],
        cardMatcher: new CardMatcher({
          name: ["jink"],
        }).toSocketPassenger(),
        conversation: TranslationPack.translationJsonPatcher(
          "{0}: you need to give a jink to {1}",
          this.Name,
          TranslationPack.patchPlayerInTranslation(from)
        ).extract(),
        reason: this.Name,
        triggeredBySkills: [this.Name],
      };

    room.notify(GameEventIdentifiers.AskForCardEvent, askForCard, to.Id);

    const { selectedCards } = await room.onReceivingAsyncResponseFrom(
      GameEventIdentifiers.AskForCardEvent,
      to.Id
    );

    if (selectedCards.length) {
      room.moveCards({
        movingCards: [
          { card: selectedCards[0], fromArea: PlayerCardsArea.HandArea },
        ],
        fromId: to.Id,
        toId: skillEffectEvent.fromId,
        toArea: PlayerCardsArea.HandArea,
        moveReason: CardMoveReason.ActiveMove,
        proposer: to.Id,
        movedByReason: this.Name,
        engagedPlayerIds: room.getAllPlayersFrom().map((player) => player.Id),
      });
    } else {
      const aimEvent =
        skillEffectEvent.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;
      if (
        room.canUseCardTo(
          new CardMatcher({ generalName: ["slash"] }),
          room.getPlayerById(aimEvent.fromId),
          to
        )
      ) {
        AimGroupUtil.addTargets(room, aimEvent, to.Id);
      }
    }

    room.removeFlag(skillEffectEvent.fromId, this.Name);

    return true;
  }
}

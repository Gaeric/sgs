import { CardId } from "../../../cards/libs/card_props";
import { CharacterGender } from "../../../characters/character";
import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { ActiveSkill, TriggerSkill } from "../../skill";
import { CommonSkill, ShadowSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "yanyu", description: "yanyu_description" })
export class YanYu extends ActiveSkill {
  public canUse(room: Room, owner: Player): boolean {
    return owner.getCardIds(PlayerCardsArea.HandArea).length > 0;
  }

  public numberOfTargets(): number {
    return 0;
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableTarget(): boolean {
    return false;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return Sanguosha.getCardById(cardId).GeneralName === "slash";
  }

  public async onUse(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId, cardIds } = event;
    if (!cardIds) {
      return false;
    }

    await room.reforge(cardIds[0], room.getPlayerById(fromId));

    return true;
  }
}

@ShadowSkill
@CommonSkill({ name: YanYu.Name, description: YanYu.Description })
export class YanYuShadow extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      event.playerId === owner.Id &&
      event.toStage === PlayerPhaseStages.PlayCardStageEnd &&
      room
        .getAlivePlayersFrom()
        .find((player) => player.Gender === CharacterGender.Male) !==
        undefined &&
      room.Analytics.getRecordEvents<GameEventIdentifiers.MoveCardEvent>(
        (event) =>
          EventPacker.getIdentifier(event) ===
            GameEventIdentifiers.MoveCardEvent &&
          event.infos.find(
            (info) =>
              info.fromId === owner.Id &&
              info.moveReason === CardMoveReason.Reforge &&
              info.movingCards.find(
                (card) =>
                  Sanguosha.getCardById(card.card).GeneralName === "slash"
              )
          ) !== undefined,
        owner.Id,
        "phase",
        undefined,
        1
      ).length > 0
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
    return room.getPlayerById(target).Gender === CharacterGender.Male;
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose a male character to draw card(s)?",
      this.GeneralName
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

    const drawNum =
      room.Analytics.getRecordEvents<GameEventIdentifiers.MoveCardEvent>(
        (moveCardEvent) =>
          EventPacker.getIdentifier(moveCardEvent) ===
            GameEventIdentifiers.MoveCardEvent &&
          moveCardEvent.infos.find(
            (info) =>
              info.fromId === event.fromId &&
              info.moveReason === CardMoveReason.Reforge &&
              info.movingCards.find(
                (card) =>
                  Sanguosha.getCardById(card.card).GeneralName === "slash"
              )
          ) !== undefined,
        event.fromId,
        "phase"
      ).reduce<number>((sum, moveCardEvent) => {
        if (moveCardEvent.infos.length === 1) {
          sum += moveCardEvent.infos[0].movingCards.filter(
            (card) => Sanguosha.getCardById(card.card).GeneralName === "slash"
          ).length;
        } else if (moveCardEvent.infos.length > 1) {
          const infos = moveCardEvent.infos.filter(
            (info) =>
              info.fromId === event.fromId &&
              info.moveReason === CardMoveReason.Reforge &&
              info.movingCards.find(
                (card) =>
                  Sanguosha.getCardById(card.card).GeneralName === "slash"
              )
          );
          for (const info of infos) {
            sum += info.movingCards.filter(
              (card) => Sanguosha.getCardById(card.card).GeneralName === "slash"
            ).length;
          }
        }

        return sum;
      }, 0);

    await room.drawCards(
      Math.min(drawNum, 3),
      event.toIds[0],
      "top",
      event.fromId,
      this.GeneralName
    );

    return true;
  }
}

import { CardType } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
import {
  CardDrawReason,
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { Sanguosha } from "../../../game/engine";
import { DamageType } from "../../../game/game_props";
import {
  AllStage,
  DrawCardStage,
  PlayerPhase,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "zhaolie", description: "zhaolie_description" })
export class ZhaoLie extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>,
    stage?: AllStage
  ) {
    return stage === DrawCardStage.CardDrawing;
  }

  isRefreshAt(room: Room, owner: Player, stage: PlayerPhase) {
    return stage === PlayerPhase.DrawCardStage;
  }

  canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>
  ) {
    return (
      owner.Id === content.fromId &&
      room.CurrentPlayerPhase === PlayerPhase.DrawCardStage &&
      content.bySpecialReason === CardDrawReason.GameStage
    );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    targetId: PlayerId
  ): boolean {
    const from = room.getPlayerById(owner);
    const to = room.getPlayerById(targetId);
    return room.withinAttackDistance(from, to);
  }

  async onTrigger() {
    return true;
  }
  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { triggeredOnEvent, toIds, fromId } = skillUseEvent;
    const toId = toIds![0];
    const drawCardEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DrawCardEvent>;
    drawCardEvent.drawAmount -= 1;
    const displayCards = room.getCards(3, "top");
    const cardDisplayEvent: ServerEventFinder<GameEventIdentifiers.CardDisplayEvent> =
      {
        displayCards,
        fromId: skillUseEvent.fromId,
        translationsMessage: TranslationPack.translationJsonPatcher(
          "{0} used skill {1}, display cards: {2}",
          TranslationPack.patchPlayerInTranslation(
            room.getPlayerById(skillUseEvent.fromId!)
          ),
          this.Name,
          TranslationPack.patchCardInTranslation(...displayCards)
        ).extract(),
      };
    room.broadcast(GameEventIdentifiers.CardDisplayEvent, cardDisplayEvent);
    let zhaolie: CardId[] = [];
    for (const cardId of displayCards) {
      const card = Sanguosha.getCardById(cardId);
      if (card.is(CardType.Basic)) {
        if (card.GeneralName !== "peach") {
          zhaolie.push(cardId);
        }
      }
    }
    const numcard = displayCards.filter(
      (cardId) =>
        Sanguosha.getCardById(cardId).is(CardType.Trick) ||
        Sanguosha.getCardById(cardId).is(CardType.Equip)
    );
    const num = numcard.length;
    const options = ["zhaolie-dama", "zhaolie-drop"];
    const askForChoosingOptionsEvent: ServerEventFinder<GameEventIdentifiers.AskForChoosingOptionsEvent> =
      {
        options,
        conversation: "please choose: zhaolie-options",
        toId,
        askedBy: fromId,
        triggeredBySkills: [this.Name],
      };

    room.notify(
      GameEventIdentifiers.AskForChoosingOptionsEvent,
      EventPacker.createUncancellableEvent<GameEventIdentifiers.AskForChoosingOptionsEvent>(
        askForChoosingOptionsEvent
      ),
      toId
    );

    const { selectedOption } = await room.onReceivingAsyncResponseFrom(
      GameEventIdentifiers.AskForChoosingOptionsEvent,
      toId
    );
    if (selectedOption === "zhaolie-drop") {
      let droppedCards = 0;
      while (droppedCards < num) {
        const response = await room.askForCardDrop(
          toId,
          1,
          [PlayerCardsArea.HandArea, PlayerCardsArea.EquipArea],
          false,
          undefined,
          this.Name
        );
        if (response.droppedCards.length > 0) {
          await room.dropCards(
            CardMoveReason.SelfDrop,
            response.droppedCards,
            toId,
            toId,
            this.GeneralName
          );
          droppedCards++;
        } else {
          if (num > 0) {
            await room.damage({
              fromId,
              toId,
              damage: num,
              damageType: DamageType.Normal,
              triggeredBySkills: [this.Name],
            });
          }
          if (zhaolie.length > 0) {
            await room.moveCards({
              movingCards: zhaolie.map((card) => ({
                card,
                fromArea: CardMoveArea.ProcessingArea,
              })),
              toId,
              toArea: CardMoveArea.HandArea,
              moveReason: CardMoveReason.ActivePrey,
            });
          }
          droppedCards = num;
        }
      }
      if (zhaolie.length !== 0) {
        await room.moveCards({
          movingCards: zhaolie.map((card) => ({
            card,
            fromArea: CardMoveArea.ProcessingArea,
          })),
          toId: skillUseEvent.fromId,
          toArea: CardMoveArea.HandArea,
          moveReason: CardMoveReason.ActivePrey,
        });
      }
    } else {
      if (num > 0) {
        await room.damage({
          fromId,
          toId,
          damage: num,
          damageType: DamageType.Normal,
          triggeredBySkills: [this.Name],
        });
      }
      if (zhaolie.length > 0) {
        await room.moveCards({
          movingCards: zhaolie.map((card) => ({
            card,
            fromArea: CardMoveArea.ProcessingArea,
          })),
          toId,
          toArea: CardMoveArea.HandArea,
          moveReason: CardMoveReason.ActivePrey,
        });
      }
    }
    zhaolie = [];
    return true;
  }
}

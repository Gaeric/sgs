import { CardType } from "../../../cards/card";
import { CardId } from "../../../cards/libs/card_props";
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
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CommonSkill, TriggerSkill } from "../../skill";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "jujian", description: "jujian_description" })
export class JuJian extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return stage === PhaseStageChangeStage.StageChanged;
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      owner.Id === content.playerId &&
      PlayerPhaseStages.FinishStageStart === content.toStage &&
      owner.getPlayerCards().length > 0
    );
  }

  public numberOfTargets(): number {
    return 1;
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return owner !== target;
  }

  public isAvailableCard(owner: PlayerId, room: Room, cardId: CardId): boolean {
    return (
      !Sanguosha.getCardById(cardId).is(CardType.Basic) &&
      room.canDropCard(owner, cardId)
    );
  }

  public getSkillLog(room: Room, owner: Player): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to drop a card except basic card and choose a target",
      this.Name
    ).extract();
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    await room.dropCards(
      CardMoveReason.SelfDrop,
      skillUseEvent.cardIds!,
      skillUseEvent.fromId,
      skillUseEvent.fromId,
      this.Name
    );

    const toId = skillUseEvent.toIds![0];
    const to = room.getPlayerById(toId);

    const options: string[] = ["jujian:draw"];
    if (to.LostHp > 0) {
      options.push("jujian:recover");
    }
    if (to.ChainLocked || !to.isFaceUp()) {
      options.push("jujian:restore");
    }

    const askForChooseEvent =
      EventPacker.createUncancellableEvent<GameEventIdentifiers.AskForChoosingOptionsEvent>(
        {
          options,
          conversation: TranslationPack.translationJsonPatcher(
            "{0}: please choose",
            this.Name
          ).extract(),
          toId,
          triggeredBySkills: [this.Name],
        }
      );

    room.notify(
      GameEventIdentifiers.AskForChoosingOptionsEvent,
      askForChooseEvent,
      toId
    );

    const response = await room.onReceivingAsyncResponseFrom(
      GameEventIdentifiers.AskForChoosingOptionsEvent,
      toId
    );
    response.selectedOption = response.selectedOption || "jujian:draw";

    if (response.selectedOption === "jujian:recover") {
      await room.recover({
        toId,
        recoveredHp: 1,
        recoverBy: toId,
      });
    } else if (response.selectedOption === "jujian:restore") {
      if (to.ChainLocked) {
        await room.chainedOn(toId);
      }
      if (!to.isFaceUp()) {
        await room.turnOver(toId);
      }
    } else {
      await room.drawCards(2, toId, "top", toId, this.Name);
    }

    return true;
  }
}

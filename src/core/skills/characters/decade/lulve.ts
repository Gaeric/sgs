import { VirtualCard } from "../../../cards/card";
import {
  CardMoveArea,
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import {
  AllStage,
  PhaseStageChangeStage,
  PlayerPhaseStages,
} from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import {
  PatchedTranslationObject,
  TranslationPack,
} from "../../../translations/translation_json_tool";

@CommonSkill({ name: "lulve", description: "lulve_description" })
export class LuLve extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PhaseStageChangeStage.StageChanged &&
      event.toStage === PlayerPhaseStages.PlayCardStageStart
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      owner.Id === content.playerId &&
      room.getOtherPlayers(owner.Id).find((player) => {
        const handcards = player.getCardIds(PlayerCardsArea.HandArea).length;
        return (
          handcards > 0 &&
          handcards < owner.getCardIds(PlayerCardsArea.HandArea).length
        );
      }) !== undefined
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
    if (owner === target) {
      return false;
    }

    const handcards = room
      .getPlayerById(target)
      .getCardIds(PlayerCardsArea.HandArea).length;
    return (
      handcards > 0 &&
      handcards <
        room.getPlayerById(owner).getCardIds(PlayerCardsArea.HandArea).length
    );
  }

  public getSkillLog(): PatchedTranslationObject {
    return TranslationPack.translationJsonPatcher(
      "{0}: do you want to choose a lulve target to use this skill?",
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
    const { fromId, toIds } = event;
    if (!toIds) {
      return false;
    }

    const options = ["lulve:prey", "lulve:turnOver"];
    const response =
      await room.doAskForCommonly<GameEventIdentifiers.AskForChoosingOptionsEvent>(
        GameEventIdentifiers.AskForChoosingOptionsEvent,
        {
          options,
          conversation: TranslationPack.translationJsonPatcher(
            "{0}: please choose lulve options: {1}",
            this.Name,
            TranslationPack.patchPlayerInTranslation(room.getPlayerById(fromId))
          ).extract(),
          toId: toIds[0],
          triggeredBySkills: [this.Name],
        },
        toIds[0],
        true
      );

    response.selectedOption = response.selectedOption || options[0];

    if (response.selectedOption === options[1]) {
      await room.turnOver(toIds[0]);

      const virtualSlash = VirtualCard.create({
        cardName: "slash",
        bySkill: this.Name,
      }).Id;
      room
        .getPlayerById(toIds[0])
        .canUseCardTo(room, virtualSlash, fromId, true) &&
        (await room.useCard({
          fromId: toIds[0],
          targetGroup: [[fromId]],
          cardId: virtualSlash,
        }));
    } else {
      await room.moveCards({
        movingCards: room
          .getPlayerById(toIds[0])
          .getCardIds(PlayerCardsArea.HandArea)
          .map((card) => ({ card, fromArea: CardMoveArea.HandArea })),
        fromId: toIds[0],
        toId: fromId,
        toArea: CardMoveArea.HandArea,
        moveReason: CardMoveReason.ActiveMove,
        proposer: toIds[0],
        triggeredBySkills: [this.Name],
      });

      await room.turnOver(fromId);
    }

    return true;
  }
}

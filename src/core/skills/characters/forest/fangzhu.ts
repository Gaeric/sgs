import {
  CardMoveReason,
  GameEventIdentifiers,
  ServerEventFinder,
} from "../../../event/event";
import { EventPacker } from "../../../event/event_packer";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea, PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CommonSkill } from "../../skill_wrappers";
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "fangzhu", description: "fangzhu_description" })
export class FangZhu extends TriggerSkill {
  public get RelatedCharacters(): string[] {
    return ["god_simayi"];
  }

  public audioIndex(characterName?: string) {
    return characterName && this.RelatedCharacters.includes(characterName)
      ? 1
      : 2;
  }

  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ) {
    return stage === DamageEffectStage.AfterDamagedEffect;
  }

  canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>
  ) {
    return owner.Id === event.toId;
  }

  targetFilter(room: Room, owner: Player, targets: PlayerId[]) {
    return targets.length === 1;
  }

  isAvailableTarget(owner: PlayerId, room: Room, target: PlayerId) {
    return owner !== target;
  }

  async onTrigger() {
    return true;
  }

  async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const { toIds, fromId } = skillUseEvent;
    const to = room.getPlayerById(toIds![0]);
    const from = room.getPlayerById(fromId);

    if (
      to.getPlayerCards().filter((id) => room.canDropCard(to.Id, id)).length <
      from.LostHp
    ) {
      await room.turnOver(toIds![0]);
      await room.drawCards(
        from.LostHp,
        toIds![0],
        undefined,
        fromId,
        this.Name
      );
    } else {
      const askForOptionsEvent: ServerEventFinder<GameEventIdentifiers.AskForChoosingOptionsEvent> =
        {
          options: ["option-one", "option-two"],
          conversation: TranslationPack.translationJsonPatcher(
            "please choose fangzhu options:{0}",
            from.LostHp
          ).extract(),
          toId: toIds![0],
          askedBy: fromId,
          triggeredBySkills: [this.Name],
        };

      room.notify(
        GameEventIdentifiers.AskForChoosingOptionsEvent,
        EventPacker.createUncancellableEvent<GameEventIdentifiers.AskForChoosingOptionsEvent>(
          askForOptionsEvent
        ),
        toIds![0]
      );

      const response = await room.onReceivingAsyncResponseFrom(
        GameEventIdentifiers.AskForChoosingOptionsEvent,
        toIds![0]
      );
      response.selectedOption = response.selectedOption || "option-one";
      if (response.selectedOption === "option-one") {
        await room.turnOver(toIds![0]);
        await room.drawCards(
          from.LostHp,
          toIds![0],
          undefined,
          fromId,
          this.Name
        );
      } else {
        const response = await room.askForCardDrop(
          toIds![0],
          from.LostHp,
          [PlayerCardsArea.HandArea, PlayerCardsArea.EquipArea],
          true,
          undefined,
          this.Name
        );

        if (response.droppedCards.length > 0) {
          await room.dropCards(
            CardMoveReason.SelfDrop,
            response.droppedCards,
            toIds![0]
          );
          await room.loseHp(toIds![0], 1);
        } else {
          await room.turnOver(toIds![0]);
          await room.drawCards(
            from.LostHp,
            toIds![0],
            undefined,
            fromId,
            this.Name
          );
        }
      }
    }

    return true;
  }
}

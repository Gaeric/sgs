import {
  CardMoveArea,
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
import { TranslationPack } from "../../../translations/translation_json_tool";

@CommonSkill({ name: "zaiqi", description: "zaiqi_description" })
export class ZaiQi extends TriggerSkill {
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
    if (owner.getFlag<number>(this.Name) !== undefined) {
      room.removeFlag(owner.Id, this.Name);
    }

    let isUseable =
      owner.Id === content.playerId &&
      content.toStage === PlayerPhaseStages.DropCardStageEnd;
    if (isUseable) {
      let droppedCardNum = 0;
      const record =
        room.Analytics.getRecordEvents<GameEventIdentifiers.MoveCardEvent>(
          (event) =>
            EventPacker.getIdentifier(event) ===
              GameEventIdentifiers.MoveCardEvent &&
            event.infos.find(
              (info) => info.toArea === CardMoveArea.DropStack
            ) !== undefined,
          content.playerId,
          "round"
        );

      for (const event of record) {
        if (event.infos.length === 1) {
          droppedCardNum += event.infos[0].movingCards.filter(
            (card) => !Sanguosha.isVirtualCardId(card.card)
          ).length;
        } else {
          const infos = event.infos.filter(
            (info) => info.toArea === CardMoveArea.DropStack
          );
          for (const info of infos) {
            droppedCardNum += info.movingCards.filter(
              (card) => !Sanguosha.isVirtualCardId(card.card)
            ).length;
          }
        }
      }

      isUseable = droppedCardNum > 0;
      if (isUseable) {
        room.setFlag(owner.Id, this.Name, droppedCardNum);
      }
    }
    return isUseable;
  }

  public targetFilter(room: Room, owner: Player, targets: PlayerId[]): boolean {
    return (
      targets.length > 0 && targets.length <= owner.getFlag<number>(this.Name)
    );
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return true;
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    skillUseEvent: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const { fromId, toIds } = skillUseEvent;
    if (!toIds || toIds.length < 1) {
      return false;
    }

    const from = room.getPlayerById(fromId);
    for (const target of toIds) {
      const options: string[] = ["zaiqi:draw"];
      if (from.Hp < from.MaxHp) {
        options.push("zaiqi:recover");
      }

      const askForChooseEvent =
        EventPacker.createUncancellableEvent<GameEventIdentifiers.AskForChoosingOptionsEvent>(
          {
            options,
            conversation: TranslationPack.translationJsonPatcher(
              "{0}: please choose",
              this.Name
            ).extract(),
            toId: target,
            triggeredBySkills: [this.Name],
          }
        );

      room.notify(
        GameEventIdentifiers.AskForChoosingOptionsEvent,
        askForChooseEvent,
        target
      );

      const response = await room.onReceivingAsyncResponseFrom(
        GameEventIdentifiers.AskForChoosingOptionsEvent,
        target
      );
      response.selectedOption = response.selectedOption || "zaiqi:draw";

      if (response.selectedOption === "zaiqi:recover") {
        await room.recover({
          toId: fromId,
          recoveredHp: 1,
          recoverBy: target,
        });
      } else {
        await room.drawCards(1, target, "top", fromId, this.Name);
      }
    }

    return true;
  }
}

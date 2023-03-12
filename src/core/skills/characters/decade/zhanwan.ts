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
import { Room } from "../../../room/room";
import { TriggerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";
import { LiuShi } from "./liushi";

@CompulsorySkill({ name: "zhanwan", description: "zhanwan_description" })
export class ZhanWan extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === PhaseStageChangeStage.StageChanged &&
      event.toStage === PlayerPhaseStages.DropCardStageEnd
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
  ): boolean {
    return (
      room.getFlag<number>(event.playerId, LiuShi.Name) !== undefined &&
      room.Analytics.getCardDropRecord(event.playerId, "phase").find((event) =>
        event.infos.find((info) =>
          info.movingCards.find(
            (card) =>
              card.fromArea === CardMoveArea.HandArea ||
              card.fromArea === CardMoveArea.EquipArea
          )
        )
      ) !== undefined
    );
  }

  public async onTrigger(): Promise<boolean> {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ): Promise<boolean> {
    const playerId = (
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>
    ).playerId;

    await room.drawCards(
      room.Analytics.getCardDropRecord(playerId, "phase").reduce<number>(
        (sum, event) => {
          for (const info of event.infos) {
            if (
              !(
                info.fromId === playerId &&
                info.moveReason === CardMoveReason.SelfDrop
              )
            ) {
              continue;
            }

            sum += info.movingCards.filter(
              (card) =>
                card.fromArea === CardMoveArea.HandArea ||
                card.fromArea === CardMoveArea.EquipArea
            ).length;
          }

          return sum;
        },
        0
      ),
      event.fromId,
      "top",
      event.fromId,
      this.Name
    );

    room.syncGameCommonRules(playerId, (user) => {
      const liushiNum = room.getFlag<number>(user.Id, LiuShi.Name);
      room.CommonRules.addAdditionalHoldCardNumber(user, liushiNum);
      room.removeFlag(user.Id, LiuShi.Name);
    });

    return true;
  }
}

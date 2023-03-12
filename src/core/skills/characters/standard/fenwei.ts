import { CardType } from "../../../cards/card";
import { CardTargetEnum } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { Sanguosha } from "../../../game/engine";
import { AimStage, AllStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { AimGroupUtil } from "../../../shares/libs/utils/aim_group";
import { LimitSkill, TriggerSkill } from "../../skill";

@LimitSkill({ name: "fenwei", description: "fenwei_description" })
export class FenWei extends TriggerSkill {
  isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>,
    stage?: AllStage
  ) {
    return (
      stage === AimStage.AfterAim &&
      Sanguosha.getCardById(event.byCardId!).AOE !== CardTargetEnum.Single &&
      Sanguosha.getCardById(event.byCardId!).is(CardType.Trick) &&
      AimGroupUtil.getAllTargets(event.allTargets).length > 1 &&
      event.isFirstTarget
    );
  }

  canUse(
    room: Room,
    owner: Player,
    event: ServerEventFinder<GameEventIdentifiers.AimEvent>
  ) {
    room.setFlag(
      owner.Id,
      this.Name,
      AimGroupUtil.getAllTargets(event.allTargets)
    );
    return true;
  }

  public targetFilter(room: Room, owner: Player, targets: PlayerId[]) {
    return targets.length > 0;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    targetId: PlayerId
  ): boolean {
    const cardTargets = room
      .getPlayerById(owner)
      .getFlag<PlayerId[]>(this.Name);
    return cardTargets.includes(targetId);
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
    const { triggeredOnEvent, toIds } = skillUseEvent;
    const aimEvent =
      triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.AimEvent>;

    aimEvent.nullifiedTargets = [...aimEvent.nullifiedTargets, ...toIds!];

    return true;
  }
}

import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { AllStage, DamageEffectStage } from "../../../game/stage_processor";
import { Player } from "../../../player/player";
import { PlayerCardsArea } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { CompulsorySkill, TriggerSkill } from "../../skill";

@CompulsorySkill({ name: "jiaozi", description: "jiaozi_description" })
export class JiaoZi extends TriggerSkill {
  public isTriggerable(
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ): boolean {
    return (
      stage === DamageEffectStage.DamageEffect ||
      stage === DamageEffectStage.DamagedEffect
    );
  }

  public canUse(
    room: Room,
    owner: Player,
    content: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    stage?: AllStage
  ): boolean {
    return (
      ((stage === DamageEffectStage.DamageEffect &&
        content.fromId === owner.Id) ||
        (stage === DamageEffectStage.DamagedEffect &&
          content.toId === owner.Id)) &&
      room
        .getOtherPlayers(owner.Id)
        .find(
          (player) =>
            player.getCardIds(PlayerCardsArea.HandArea).length >=
            owner.getCardIds(PlayerCardsArea.HandArea).length
        ) === undefined
    );
  }

  public async onTrigger() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    const damageEvent =
      event.triggeredOnEvent as ServerEventFinder<GameEventIdentifiers.DamageEvent>;

    damageEvent.damage++;

    return true;
  }
}

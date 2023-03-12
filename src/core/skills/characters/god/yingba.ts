import { CardMatcher } from "../../../cards/libs/card_matcher";
import { CardId } from "../../../cards/libs/card_props";
import { GameEventIdentifiers, ServerEventFinder } from "../../../event/event";
import { INFINITE_DISTANCE } from "../../../game/game_props";
import { Player } from "../../../player/player";
import { PlayerId } from "../../../player/player_props";
import { Room } from "../../../room/room";
import { MarkEnum } from "../../../shares/types/mark_list";
import { ActiveSkill, RulesBreakerSkill } from "../../skill";
import { CommonSkill, ShadowSkill } from "../../skill_wrappers";

@CommonSkill({ name: "yingba", description: "yingba_description" })
export class YingBa extends ActiveSkill {
  public canUse(room: Room, owner: Player) {
    return !owner.hasUsedSkill(this.Name);
  }

  public cardFilter(room: Room, owner: Player, cards: CardId[]): boolean {
    return cards.length === 0;
  }

  public numberOfTargets() {
    return 1;
  }

  public isAvailableTarget(
    owner: PlayerId,
    room: Room,
    target: PlayerId
  ): boolean {
    return room.getPlayerById(target).MaxHp > 1 && owner !== target;
  }

  public isAvailableCard() {
    return false;
  }

  public async onUse() {
    return true;
  }

  public async onEffect(
    room: Room,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>
  ) {
    if (!event.toIds) {
      return false;
    }

    const toId = event.toIds[0];
    await room.changeMaxHp(toId, -1);
    room.addMark(toId, MarkEnum.PingDing, 1);

    await room.changeMaxHp(event.fromId, -1);

    return true;
  }
}

@ShadowSkill
@CommonSkill({ name: YingBa.Name, description: YingBa.Description })
export class YingBaShadow extends RulesBreakerSkill {
  public breakCardUsableDistanceTo(
    cardId: CardId | CardMatcher | undefined,
    room: Room,
    owner: Player,
    target: Player
  ): number {
    if (target.getMark(MarkEnum.PingDing) > 0) {
      return INFINITE_DISTANCE;
    } else {
      return 0;
    }
  }
}

import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { RulesBreakerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "huaizi", description: "huaizi_description" })
export class HuaiZi extends RulesBreakerSkill {
  public audioIndex(): number {
    return 0;
  }

  public breakBaseCardHoldNumber(room: Room, owner: Player) {
    return owner.MaxHp;
  }
}

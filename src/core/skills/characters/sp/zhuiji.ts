import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { RulesBreakerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "zhuiji", description: "zhuiji_description" })
export class ZhuiJi extends RulesBreakerSkill {
  public audioIndex(): number {
    return 0;
  }

  public breakDistanceTo(room: Room, owner: Player, target: Player): number {
    return target.Hp <= owner.Hp ? 1 : 0;
  }
}

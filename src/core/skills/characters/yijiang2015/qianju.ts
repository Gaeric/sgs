import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { RulesBreakerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "qianju", description: "qianju_description" })
export class QianJu extends RulesBreakerSkill {
  public audioIndex(): number {
    return 0;
  }

  public breakOffenseDistance(room: Room, owner: Player): number {
    return owner.LostHp;
  }
}

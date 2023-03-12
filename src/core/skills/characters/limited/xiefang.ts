import { CharacterGender } from "../../../characters/character";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { RulesBreakerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "xiefang", description: "xiefang_description" })
export class XieFang extends RulesBreakerSkill {
  public audioIndex(): number {
    return 0;
  }

  public breakOffenseDistance(room: Room, owner: Player): number {
    return room.AlivePlayers.filter(
      (player) => player.Gender === CharacterGender.Female
    ).length;
  }
}

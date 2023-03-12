import { OffenseHorseSkill } from "../../cards/standard/offense_horse";
import { CompulsorySkill } from "../../skill";

@CompulsorySkill({ name: "mashu", description: "mashu_description" })
export class MaShu extends OffenseHorseSkill {
  public audioIndex(): number {
    return 0;
  }
}

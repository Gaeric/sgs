import { DefenseHorseSkill } from "../../cards/standard/defense_horse";
import { CompulsorySkill } from "../../skill";

@CompulsorySkill({ name: "feiying", description: "feiying_description" })
export class FeiYing extends DefenseHorseSkill {
  public audioIndex(): number {
    return 0;
  }
}

import { Skill } from "../../skill";
import { CompulsorySkill, LordSkill } from "../../skill_wrappers";

@LordSkill
@CompulsorySkill({ name: "yuwei", description: "yuwei_description" })
export class YuWei extends Skill {
  public audioIndex(): number {
    return 0;
  }

  public canUse(): boolean {
    return false;
  }

  public isRefreshAt(): boolean {
    return false;
  }

  public async onUse(): Promise<boolean> {
    return true;
  }

  public async onEffect(): Promise<boolean> {
    return true;
  }
}

import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { Skill, SkillProhibitedSkill, SkillType } from "../../skill";
import {
  OnDefineReleaseTiming,
  SkillLifeCycle,
} from "../../skill_hooks";
import {
  CommonSkill,
  PersistentSkill,
  ShadowSkill,
} from "../../skill_wrappers";

@ShadowSkill
@PersistentSkill()
@CommonSkill({
  name: "uncompulsory_blocker",
  description: "uncompulsory_blocker_description",
})
export class UncompulsoryBlocker
  extends SkillProhibitedSkill
  implements OnDefineReleaseTiming
{
  public async whenObtainingSkill(room: Room, player: Player) {
    for (const playerSkill of player.getSkillProhibitedSkills(true)) {
      this.skillFilter(playerSkill, player) &&
        (await SkillLifeCycle.executeHookedOnNullifying(
          playerSkill,
          room,
          player
        ));
    }
  }

  public async whenLosingSkill(room: Room, player: Player) {
    for (const playerSkill of player.getSkillProhibitedSkills(true)) {
      this.skillFilter(playerSkill, player) &&
        (await SkillLifeCycle.executeHookedOnEffecting(
          playerSkill,
          room,
          player
        ));
    }
  }

  public skillFilter(skill: Skill, owner: Player): boolean {
    return ![SkillType.Compulsory, SkillType.Awaken].includes(skill.SkillType);
  }
}

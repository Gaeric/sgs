import { CharacterNationality } from "../../../characters/character";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { RulesBreakerSkill } from "../../skill";
import { CompulsorySkill } from "../../skill_wrappers";

@CompulsorySkill({ name: "juliao", description: "juliao_description" })
export class JuLiao extends RulesBreakerSkill {
  public audioIndex(): number {
    return 0;
  }

  public breakDefenseDistance(room: Room, owner: Player): number {
    return (
      room.AlivePlayers.reduce<CharacterNationality[]>((allNations, player) => {
        if (!allNations.includes(player.Nationality)) {
          allNations.push(player.Nationality);
        }
        return allNations;
      }, []).length - 1
    );
  }
}

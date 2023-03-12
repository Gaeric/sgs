import { CharacterNationality } from "../../../characters/character";
import { Player } from "../../../player/player";
import { Room } from "../../../room/room";
import { RulesBreakerSkill } from "../../skill";
import { CompulsorySkill, LordSkill } from "../../skill_wrappers";
import { YaoHu } from "./yaohu";

@LordSkill
@CompulsorySkill({ name: "huaibi", description: "huaibi_description" })
export class HuaiBi extends RulesBreakerSkill {
  public breakAdditionalCardHoldNumber(room: Room, owner: Player): number {
    const nationality = owner.getFlag<CharacterNationality>(YaoHu.Name);
    return nationality !== undefined
      ? room.AlivePlayers.filter((player) => player.Nationality === nationality)
          .length
      : 0;
  }
}

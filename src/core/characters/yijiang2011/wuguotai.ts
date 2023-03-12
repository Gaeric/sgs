import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class WuGuoTai extends Character {
  constructor(id: number) {
    super(
      id,
      "wuguotai",
      CharacterGender.Female,
      CharacterNationality.Wu,
      3,
      3,
      GameCharacterExtensions.YiJiang2011,
      [
        skillLoaderInstance.getSkillByName("ganlu"),
        skillLoaderInstance.getSkillByName("buyi"),
      ]
    );
  }
}

import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class LvLingQi extends Character {
  constructor(id: number) {
    super(
      id,
      "lvlingqi",
      CharacterGender.Female,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.Decade,
      [
        ...skillLorderInstance.getSkillsByName("guowu"),
        skillLorderInstance.getSkillByName("zhuangrong"),
      ]
    );
  }
}

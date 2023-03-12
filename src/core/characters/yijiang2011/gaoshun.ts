import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { JinJiu, XianZhen } from "../../skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLorderInstance = SkillLoader.getInstance();

export class GaoShun extends Character {
  constructor(id: number) {
    super(
      id,
      "gaoshun",
      CharacterGender.Male,
      CharacterNationality.Qun,
      4,
      4,
      GameCharacterExtensions.YiJiang2011,
      [
        skillLorderInstance.getSkillByName(JinJiu.GeneralName),
        ...skillLorderInstance.getSkillsByName(XianZhen.GeneralName),
      ]
    );
  }
}

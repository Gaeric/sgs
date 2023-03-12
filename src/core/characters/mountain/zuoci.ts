import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { HuaShen, XinSheng } from "../../skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class ZuoCi extends Character {
  constructor(id: number) {
    super(
      id,
      "zuoci",
      CharacterGender.Male,
      CharacterNationality.Qun,
      3,
      3,
      GameCharacterExtensions.Mountain,
      [
        skillLoaderInstance.getSkillByName(HuaShen.GeneralName),
        skillLoaderInstance.getSkillByName(XinSheng.GeneralName),
      ]
    );
  }
}

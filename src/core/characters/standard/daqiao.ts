import { GameCharacterExtensions } from "../../game/game_props";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";

const skillLoaderInstance = SkillLoader.getInstance();

export class DaQiao extends Character {
  constructor(id: number) {
    super(
      id,
      "daqiao",
      CharacterGender.Female,
      CharacterNationality.Wu,
      3,
      3,
      GameCharacterExtensions.Standard,
      [
        skillLoaderInstance.getSkillByName("guose"),
        skillLoaderInstance.getSkillByName("liuli"),
      ]
    );
  }
}

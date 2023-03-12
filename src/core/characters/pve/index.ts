import { GuanSuo } from "../limited/guansuo";
import { SkillLoader } from "../../game/package_loader/loader.skills";
import { Character, CharacterGender, CharacterNationality } from "../character";
import { GameCharacterExtensions } from "../../game/game_props";

import {
  PveClassicLianZhen,
  PveClassicQiSha,
  PveClassicTianJi,
  PveClassicTianLiang,
  PveClassicTianTong,
  PveClassicTianXiang,
} from "../../skills";

export const PvePackage: (index: number) => Character[] = (index) => [
  new PveLongShen(index++),

  new PveSoldier(index++),
  new PveQiSha(index++),
  new PveTianJi(index++),
  new PveTianLiang(index++),
  new PveTianTong(index++),
  new PveTianXiang(index++),
  new PveLianZhen(index++),

  new GuanSuo(index++),
];

const skillLoaderInstance = SkillLoader.getInstance();

export class PveLongShen extends Character {
  constructor(id: number) {
    super(
      id,
      "pve_longshen",
      CharacterGender.Female,
      CharacterNationality.God,
      3,
      3,
      GameCharacterExtensions.Pve,
      [skillLoaderInstance.getSkillByName("pve_longshen_qifu")]
    );
  }
}

export class PveSoldier extends Character {
  constructor(id: number) {
    super(
      id,
      "pve_soldier",
      CharacterGender.Female,
      CharacterNationality.God,
      4,
      4,
      GameCharacterExtensions.Pve,
      []
    );
  }
}

export class PveTianTong extends Character {
  constructor(id: number) {
    super(
      id,
      "pve_tiantong",
      CharacterGender.Female,
      CharacterNationality.God,
      4,
      4,
      GameCharacterExtensions.Pve,
      [skillLoaderInstance.getSkillByName(PveClassicTianTong.Name)]
    );
  }
}

export class PveTianLiang extends Character {
  constructor(id: number) {
    super(
      id,
      "pve_tianliang",
      CharacterGender.Female,
      CharacterNationality.God,
      4,
      4,
      GameCharacterExtensions.Pve,
      [skillLoaderInstance.getSkillByName(PveClassicTianLiang.Name)]
    );
  }
}

export class PveTianJi extends Character {
  constructor(id: number) {
    super(
      id,
      "pve_tianji",
      CharacterGender.Female,
      CharacterNationality.God,
      4,
      4,
      GameCharacterExtensions.Pve,
      [skillLoaderInstance.getSkillByName(PveClassicTianJi.Name)]
    );
  }
}

export class PveTianXiang extends Character {
  constructor(id: number) {
    super(
      id,
      "pve_tianxiang",
      CharacterGender.Female,
      CharacterNationality.God,
      4,
      4,
      GameCharacterExtensions.Pve,
      [skillLoaderInstance.getSkillByName(PveClassicTianXiang.Name)]
    );
  }
}

export class PveQiSha extends Character {
  constructor(id: number) {
    super(
      id,
      "pve_qisha",
      CharacterGender.Female,
      CharacterNationality.God,
      4,
      4,
      GameCharacterExtensions.Pve,
      [skillLoaderInstance.getSkillByName(PveClassicQiSha.Name)]
    );
  }
}

export class PveLianZhen extends Character {
  constructor(id: number) {
    super(
      id,
      "pve_lianzhen",
      CharacterGender.Female,
      CharacterNationality.God,
      4,
      4,
      GameCharacterExtensions.Pve,
      [...skillLoaderInstance.getSkillsByName(PveClassicLianZhen.GeneralName)]
    );
  }
}

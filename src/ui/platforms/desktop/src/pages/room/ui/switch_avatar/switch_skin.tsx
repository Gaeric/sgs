import { CharacterSkinInfo } from 'skins/skins';
import { PlayerId } from 'core/player/player_props';

export type HistoryCharacterSkin = {
  playerId: PlayerId;
  characterName: string;
  skinNameList: string[];
  skinName: string;
  nextTime: number;
};

let historyCharacterSkinInfo: HistoryCharacterSkin[] = [];
export function getSkinName(
  characterName: string,
  playerId: PlayerId,
  skinData: CharacterSkinInfo[],
  skinName?: string,
) {
  const currentTime = new Date().getTime();
  const history = historyCharacterSkinInfo.find(
    history => history.characterName === characterName && history.playerId === playerId,
  );

  if (history) {
    if (currentTime >= history.nextTime) {
      history.skinName = history.skinNameList[Math.floor(Math.random() * history.skinNameList.length)];
      history.nextTime = currentTime + Math.floor(Math.random() * 5 + 30) * 1000;
    }
    if (skinName) {
      if (skinName === 'random') {
        history.nextTime = currentTime;
      } else {
        history.nextTime = currentTime + 999999999;
        history.skinName = skinName;
      }
    }
    return history;
  }

  const historyCharacterSkin: HistoryCharacterSkin = {
    playerId: playerId,
    characterName: characterName,
    skinNameList: [characterName],
    skinName: characterName,
    nextTime: currentTime + Math.floor(Math.random() * 5 + 30) * 1000,
  };
  skinData
    .find(skinInfo => skinInfo.character === characterName)
    ?.infos.forEach(info => info.images.find(imageInfo => historyCharacterSkin.skinNameList.push(imageInfo.name)));

  historyCharacterSkinInfo.push(historyCharacterSkin);
  return historyCharacterSkin;
}

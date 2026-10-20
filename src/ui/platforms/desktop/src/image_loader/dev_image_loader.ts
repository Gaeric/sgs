import { CharacterEquipSections } from 'core/characters/character';
import { PlayerRole } from 'core/player/player_props';
import { PlayerId } from 'core/player/player_props';
import { Functional } from 'core/shares/libs/functional';
import { Precondition } from 'core/shares/libs/precondition/precondition';
import { GameMode } from 'core/shares/types/room_props';
import { SkillType } from 'core/skills/skill';
import { LobbyButton } from 'props/game_props';
import { CharacterSkinInfo } from 'skins/skins';
import { getLobbyButtonImage } from './dev_button_image_loader';
import { getSkillButtonImages } from './dev_button_image_loader';
import { ImageLoader } from './image_loader';

const baseHost: string = '/cdn';

const gameModeIcons = {
  [GameMode.Standard]: 'general_mode',
  [GameMode.OneVersusTwo]: '1v2_mode',
  [GameMode.TwoVersusTwo]: '2v2_mode',
  [GameMode.Hegemony]: 'hegemony_mode',
  [GameMode.Pve]: 'pve_mode',
};

export class DevImageLoader implements ImageLoader {
  public async getCardImage(name: string) {
    return {
      src: `${baseHost}/images/cards/${name}.webp`,
      alt: name,
    };
  }

  public async getCharacterSkinPlay(
    characterName: string,
    skinData?: CharacterSkinInfo[],
    playerId?: PlayerId,
    skinName?: string,
  ) {
    return {
      src: `${baseHost}/images/characters/${characterName}.png`,
      alt: characterName,
    };
  }

  public async getCharacterImage(characterName: string) {
    return {
      src: `${baseHost}/images/characters/${characterName}.png`,
      alt: characterName,
    };
  }

  public getCardBack() {
    return { src: `${baseHost}/images/cards/cardback.webp`, alt: 'New QSanguosha' };
  }

  getDelayedTricksImage(cardName: string) {
    return { src: `${baseHost}/images/delayed_tricks/${cardName}.png`, alt: cardName };
  }

  public getSkillButtonImage(skillType: SkillType, size: 'wide' | 'normal') {
    return getSkillButtonImages(skillType, size, baseHost);
  }

  public async getPlayerRoleCard(role: PlayerRole, gameMode: GameMode, selfRole?: PlayerRole) {
    const roleName =
      gameMode === GameMode.TwoVersusTwo && selfRole !== undefined
        ? role === selfRole
          ? 'ally'
          : 'enemy'
        : Functional.getPlayerRoleRawText(role, gameMode);

    return {
      src: `${baseHost}/images/system/death/${roleName}.png`,
      alt: roleName,
    };
  }

  public async getOthersEquipCard(cardName: string) {
    return { src: `${baseHost}/images/others_equips/${cardName}.png`, alt: cardName };
  }
  public async getOthersAbortedEquipCard() {
    return { src: `${baseHost}/images/slim_equips/aborted.png`, alt: 'aborted' };
  }

  public getChainImage() {
    return { alt: '', src: `${baseHost}/images/system/chain.png` };
  }

  public getBackgroundImage() {
    return { alt: '', src: `${baseHost}/images/system/background.jpg` };
  }

  public getWaitingRoomBackgroundImage() {
    return { alt: '', src: `${baseHost}/images/system/waiting_room_background.jpg` };
  }

  public getEmptySeatImage() {
    return { src: `${baseHost}/images/system/empty_seat.png`, alt: '' };
  }

  public getUnknownCharacterImage() {
    return { src: `${baseHost}/images/system/player_seat.png`, alt: '' };
  }

  public async getSlimAbortedEquipSection(section: CharacterEquipSections) {
    let sectionName: string | undefined;
    switch (section) {
      case CharacterEquipSections.Weapon:
        sectionName = 'aborted_weapon';
        break;
      case CharacterEquipSections.Shield:
        sectionName = 'aborted_shield';
        break;
      case CharacterEquipSections.DefenseRide:
        sectionName = 'aborted_defense_ride';
        break;
      case CharacterEquipSections.OffenseRide:
        sectionName = 'aborted_offense_ride';
        break;
      case CharacterEquipSections.Precious:
        sectionName = 'aborted_precious';
        break;
      default:
        throw Precondition.UnreachableError(section);
    }

    const image: string = (await import(`${baseHost}/images/slim_equips/${sectionName}.png`)).default;
    return { alt: 'Aborted Slim Equip Card', src: image };
  }

  public async getSlimEquipCard(cardName: string) {
    return { src: `${baseHost}/images/slim_equips/${cardName}.png`, alt: 'Slim Equip Card' };
  }

  public async getSlimCard(cardName: string) {
    return { src: `${baseHost}/images/slim_cards/${cardName}.png`, alt: 'Slim Card' };
  }

  public getCardNumberBgImage() {
    return { src: `${baseHost}/images/system/cardNumBg.png`, alt: '' };
  }

  public getTurnedOverCover() {
    return { src: `${baseHost}/images/system/turn_over.png`, alt: '' };
  }

  public getGameModeIcon(mode: GameMode) {
    return { src: `${baseHost}/images/lobby/${gameModeIcons[mode]}.png`, alt: '' };
  }

  public getRandomLobbyIllustration() {
    const index = Math.floor(Math.random() * 8) + 1;
    return { src: `${baseHost}/images/lobby/illustration${index}.png`, alt: '' };
  }

  public getLobbyBackgroundImage() {
    return { src: `${baseHost}/images/lobby/background.png`, alt: '' };
  }

  public getLobbyButtonImage(buttonVariant: LobbyButton) {
    return { src: getLobbyButtonImage(buttonVariant, baseHost), alt: '' };
  }

  public getCreateRoomButtonImage() {
    return { src: `${baseHost}/images/lobby/create.png`, alt: '' };
  }

  public getRoomListBackgroundImage() {
    return { src: `${baseHost}/images/lobby/room_list.png`, alt: '' };
  }

  public getDialogBackgroundImage() {
    return { src: `${baseHost}/images/system/dialog_background.png`, alt: '' };
  }

  public getAcknowledgementImage() {
    return { src: `${baseHost}/images/system/acknowledge.png`, alt: '' };
  }
  public getGameLogBoradImage() {
    return { src: `${baseHost}/images/system/game_log_board.png`, alt: '' };
  }
  public getFeedbackImage() {
    return { src: `${baseHost}/images/system/feedback.png`, alt: '' };
  }
}

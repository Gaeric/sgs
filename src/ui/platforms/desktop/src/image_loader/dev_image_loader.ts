import { PlayerRole } from 'core/player/player_props';
import { Functional } from 'core/shares/libs/functional';
import { ImageLoader } from './image_loader';

export class DevImageLoader implements ImageLoader {
  public async getCardImage(name: string) {
    return {
      alt: name,
    };
  }

  public async getCharacterImage(name: string) {
    return {
      alt: name,
    };
  }

  public getCardBack() {
    return { alt: 'New QSanguosha' };
  }

  public async getPlayerRoleCard(role: PlayerRole) {
    return { alt: Functional.getPlayerRoleRawText(role) };
  }
  public async getOthersEquipCard(cardName: string) {
    return { alt: cardName };
  }

  public getBackgroundImage() {
    return { alt: '' };
  }
  public getEmptySeatImage() {
    return { alt: '' };
  }
  public getUnknownCharacterImage() {
    return { alt: '' };
  }

  async getSlimEquipCard(cardName: string) {
    return { alt: '' };
  }

  async getSlimCard(cardName: string) {
    return { alt: '' };
  }

  getCardNumberBgImage() {
    return { alt: '' };
  }

  getTurnedOverCover() {
    return { alt: '' };
  }
}
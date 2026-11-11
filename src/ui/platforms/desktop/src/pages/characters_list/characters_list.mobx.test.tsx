import { CharacterId } from 'core/characters/character';
import { autorun, isObservable, isObservableArray } from 'mobx';
import { CharactersList, CharactersListProps } from './characters_list';

jest.mock('core/game/engine', () => ({
  Sanguosha: {
    getGameCharacterExtensions: () => ['standard', 'other'],
    getNationalitiesList: () => [0, 1],
    getCharacterById: (id: number) => ({ Name: `character-${id}` }),
  },
}));
jest.mock('core/game/package_loader/loader.characters', () => ({ CharacterLoader: {} }));
jest.mock('core/shares/libs/functional', () => ({ Functional: { getPlayerNationalityText: String } }));
jest.mock('ui/audio/install', () => ({ installAudioPlayerService: () => ({}) }));
jest.mock('ui/character/character', () => ({ CharacterCard: () => null }));
jest.mock('ui/character/characterSkin', () => ({ CharacterSkinCard: () => null, CharacterSpec: () => null }));
jest.mock('ui/check_box/check_box_group', () => ({ CheckBoxGroup: () => null }));
jest.mock('ui/button/button', () => ({ Button: () => null }));
jest.mock('ui/picture/picture', () => ({ Picture: () => null }));
jest.mock('ui/tooltip/tooltip', () => ({ Tooltip: () => null }));

type CharacterFixture = {
  focusedCharacterId: CharacterId;
  focusedSkinName: string;
  characterExtensionOptions: { checked: boolean }[];
  nationalityOptions: { checked: boolean }[];
  checkedExtensions: string[];
  onHoverCharacter(id: CharacterId): () => void;
  onCheckExtension(exts: string[]): void;
};

test('deferred character handler batches both observed fields and preserves option depth', async () => {
  const props = {
    translator: { tr: (value: string) => value },
    imageLoader: { getLobbyBackgroundImage: () => undefined, getRoomListBackgroundImage: () => undefined },
  } as unknown as CharactersListProps;
  const page = new CharactersList(props) as unknown as CharacterFixture;
  const states: string[] = [];
  const dispose = autorun(() => states.push(`${page.focusedCharacterId}:${page.focusedSkinName}`));
  const options: boolean[] = [];
  const disposeOptions = autorun(() => options.push(page.characterExtensionOptions[1].checked));
  try {
    const hover = page.onHoverCharacter(1);
    await Promise.resolve();
    hover();
    expect(states).toEqual(['undefined:undefined', '1:character-1']);
    expect(isObservable(page.characterExtensionOptions[0])).toBe(true);
    expect(isObservable(page.nationalityOptions[0])).toBe(true);
    expect(isObservableArray(page.checkedExtensions)).toBe(true);
    page.onCheckExtension(['standard']);
    expect(options).toEqual([true, false]);
  } finally {
    disposeOptions();
    dispose();
  }
});

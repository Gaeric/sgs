import { Card } from 'core/cards/card';
import { Sanguosha } from 'core/game/engine';
import { autorun, configure, isObservable } from 'mobx';
import { ClientCard } from './card/card';
import { FlatClientCard } from './card/flat_card';
import { FlatDemoCard } from './card/flat_demo_card';
import { CharacterCard } from './character/character';
import { CharacterSkinCard } from './character/characterSkin';
import { SkinCard } from './skin/skin';

// Unit-test the real MobX decorators and callbacks without React's observer
// lifecycle wrapper; render tracking is covered separately by a mounted test.
jest.mock('mobx-react', () => ({ observer: (Component: unknown) => Component }));
jest.mock('core/game/engine', () => ({ Sanguosha: { getCardById: jest.fn() } }));
jest.mock('ui/card_description/card_description', () => ({ CardDescription: () => null }));

// Instantiate the real decorated classes, observing precisely the image fields
// read by their renders. Deferred loaders force writes across an await boundary.
describe('UI image action boundaries', () => {
  beforeEach(() => configure({ enforceActions: 'always' }));
  afterEach(() => configure({ enforceActions: 'observed' }));

  test.each([
    ['card', ClientCard, ['cardImage'], 'getCardImage'],
    ['flat card', FlatClientCard, ['equipName', 'equipImage'], 'getOthersEquipCard'],
    ['demo card', FlatDemoCard, ['cardImage'], 'getSlimCard'],
    ['character', CharacterCard, ['characterImage'], 'getCharacterImage'],
    ['skin', SkinCard, ['skinImage'], 'getCharacterSkinPlay'],
  ])('%s commits mount/update images in actions', async (_name, Component, fields, loaderName) => {
    let resolve!: (image: { src: string; alt: string }) => void;
    let pending = new Promise<{ src: string; alt: string }>(done => {
      resolve = done;
    });
    const loader = jest.fn(() => pending);
    const card = { Name: 'test', isVirtualCard: () => false };
    const view = new (Component as any)({
      card,
      character: card,
      cardName: 'test',
      skinName: 'test',
      imageLoader: { [loaderName as string]: loader },
    });
    const snapshots: unknown[][] = [];
    const dispose = autorun(() => snapshots.push((fields as string[]).map(field => view[field])));
    try {
      const mount = view.componentDidMount();
      expect(loader).toHaveBeenCalledTimes(1);
      resolve({ src: 'first.png', alt: 'test' });
      await mount;
      expect(snapshots[snapshots.length - 1]).toContain('first.png');
      if (view.componentDidUpdate) {
        pending = new Promise(done => {
          resolve = done;
        });
        // Flat cards skip an update when the loaded name already matches.
        view.props = { ...view.props, card: { ...card, Name: 'next' } };
        const update = view.componentDidUpdate();
        resolve({ src: 'next.png', alt: 'next' });
        await update;
        expect(snapshots[snapshots.length - 1]).toContain('next.png');
      }
    } finally {
      dispose();
    }
  });

  test('virtual cards commit both sequential image completions and retain the original card by ref', async () => {
    const original = { Name: 'original' } as Card;
    (Sanguosha.getCardById as jest.Mock).mockReturnValue(original);
    const view = new ClientCard({
      card: { Name: 'virtual', ActualCardIds: [1], isVirtualCard: () => true } as unknown as Card,
      imageLoader: {
        getSlimCard: jest.fn(async () => ({ src: 'slim.png' })),
        getCardImage: jest.fn(async () => ({ src: 'original.png' })),
      },
    } as any) as any;
    const dispose = autorun(() => [view.originalCard, view.realFlatCardImage, view.cardImage]);
    try {
      await view.componentDidMount();
      expect(view.originalCard).toBe(original);
      expect(isObservable(original)).toBe(false);
      expect(view.realFlatCardImage).toBe('slim.png');
      expect(view.cardImage).toBe('original.png');
    } finally {
      dispose();
    }
  });

  test('skin carousel writes all three async images, including empty side images', async () => {
    const view = new CharacterSkinCard({
      character: { Name: 'test' },
      imageLoader: { getCharacterSkinPlay: jest.fn(async (_character, _data, _player, skin) => ({ src: skin })) },
    } as any) as any;
    const dispose = autorun(() => [
      view.characterImage,
      view.characterSkinImageL,
      view.characterSkinImageR,
      view.skinName,
    ]);
    try {
      view.skinNameLists = ['test', 'second', 'third'];
      await view.getSkinImage();
      expect([view.characterImage, view.characterSkinImageL, view.characterSkinImageR]).toEqual([
        'test',
        'third',
        'second',
      ]);
      view.nextSkin();
      await view.getSkinImage();
      expect(view.skinName).toBe('second');
      view.preSkin();
      await view.getSkinImage();
      expect(view.skinName).toBe('test');
      view.skinNameLists = ['test'];
      await view.getSkinImage();
      expect([view.characterImage, view.characterSkinImageL, view.characterSkinImageR]).toEqual(['test', '', '']);
    } finally {
      dispose();
    }
  });
});

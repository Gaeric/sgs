import { configure } from 'mobx';
import { TextDecoder, TextEncoder } from 'util';

// Jest 26's jsdom predates these browser APIs used by Router 7.
Object.assign(globalThis, { TextEncoder, TextDecoder });

// React concurrent roots need an explicit act environment in this Jest setup.
// DOM tests wrap renders, events, timer updates and unmounts in act().
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

configure({ enforceActions: 'observed' });

// MobX reports action violations as warnings rather than throwing. Collect them
// so callback/reaction error handlers cannot swallow the test failure. Unrelated
// warnings still pass through unchanged.
let actionViolations: string[] = [];
beforeEach(() => {
  actionViolations = [];
  const warn = console.warn;
  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ');
    if (message.includes('[MobX]') && message.includes('strict-mode')) {
      actionViolations.push(message);
      return;
    }
    warn(...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  expect(actionViolations).toEqual([]);
});

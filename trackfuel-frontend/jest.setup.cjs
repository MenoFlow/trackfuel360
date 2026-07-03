// jest.setup.cjs
require('@testing-library/jest-dom');
require('whatwg-fetch');

// jest.setup.cjs (ajoute en haut)
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    value: () => true,
    writable: true,
  });

// Polyfills texte
const { TextEncoder, TextDecoder } = require('text-encoding');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// POLYFILL COMPLET POUR RADIX + JSDOM
Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { value: () => true, writable: true },
    setPointerCapture: { value: () => {}, writable: true },
    releasePointerCapture: { value: () => {}, writable: true },
    scrollIntoView: { value: () => {}, writable: true }, // <--- LA LIGNE MAGIQUE
  });

  // Polyfills Node → Web API
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.BroadcastChannel = class {
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
};

// WritableStream + TransformStream (MSW)
const { WritableStream, TransformStream } = require('stream/web');
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// MOCK i18next (supprime le warning)
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: () => new Promise(() => {}) },
  }),
  Trans: ({ children }) => children,
}));

// MOCK toast (si pas déjà fait dans le test)
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom has no layout engine. Keep media queries at a desktop viewport so the
// real responsive menu can render without replacing the component itself.
vi.stubGlobal('matchMedia', (query: string): MediaQueryList => {
  const minWidth = query.match(/min-width:\s*(\d+)px/);
  const maxWidth = query.match(/max-width:\s*(\d+)px/);
  const matches =
    Boolean(minWidth || maxWidth) &&
    (!minWidth || window.innerWidth >= Number(minWidth[1])) &&
    (!maxWidth || window.innerWidth <= Number(maxWidth[1]));

  return {
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
vi.stubGlobal('scrollTo', vi.fn());

afterEach(cleanup);

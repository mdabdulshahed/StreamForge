import { describe, expect, it } from 'vitest';

import { readNetworkInfo } from './network-info.model';

describe('readNetworkInfo', () => {
  it('returns null in a browser without the Network Information API, e.g. jsdom, Safari or Firefox', () => {
    expect(readNetworkInfo()).toBeNull();
  });
});

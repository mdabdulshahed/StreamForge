import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { detectProtocol } from '../models';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let catalog: CatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    catalog = TestBed.inject(CatalogService);
  });

  it('exposes a non-empty catalog', () => {
    expect(catalog.all().length).toBeGreaterThan(0);
  });

  it('gives every asset a unique id', () => {
    const ids = catalog.all().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('declares a protocol matching the manifest extension', () => {
    // Guards the catalog against a copy-paste slip that would have the UI badge
    // a stream as DASH while handing Shaka an .m3u8.
    for (const asset of catalog.all()) {
      expect(detectProtocol(asset.manifestUrl), asset.id).toBe(asset.type);
    }
  });

  it('serves every manifest over HTTPS', () => {
    for (const asset of catalog.all()) {
      expect(asset.manifestUrl.startsWith('https://'), asset.id).toBe(true);
    }
  });

  it('models live streams as having no fixed duration', () => {
    for (const asset of catalog.all()) {
      expect(asset.isLive ? asset.durationSeconds === null : asset.durationSeconds !== null).toBe(
        true,
      );
    }
  });

  it('looks assets up by id and reports misses as undefined', () => {
    const first = catalog.all()[0];
    expect(catalog.getById(first.id)).toBe(first);
    expect(catalog.getById('no-such-title')).toBeUndefined();
  });

  it('builds only non-empty rails', () => {
    const rows = catalog.rows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.assets.length, row.collection.id).toBeGreaterThan(0);
      for (const asset of row.assets) {
        expect(asset.collections).toContain(row.collection.id);
      }
    }
  });

  it('excludes the subject from its own related list and only returns overlaps', () => {
    const subject = catalog.all()[0];
    const related = catalog.related(subject);
    expect(related.some((a) => a.id === subject.id)).toBe(false);
    for (const a of related) {
      expect(a.categories.some((c) => subject.categories.includes(c))).toBe(true);
    }
  });

  it('returns nothing for an empty search term', () => {
    expect(catalog.search('   ')).toEqual([]);
  });

  it('searches case-insensitively across titles', () => {
    const target = catalog.all()[0];
    const hits = catalog.search(target.title.toUpperCase());
    expect(hits.map((a) => a.id)).toContain(target.id);
  });
});

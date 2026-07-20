import { describe, it, expect } from 'vitest';
import {
  joinUrl,
  escapeString,
  formatLiteral,
  buildEntityPath,
  appendQueryParams,
  encodeODataValue,
} from '../src/core/url.js';

describe('joinUrl', () => {
  it('joins base and path without duplicating slashes', () => {
    expect(joinUrl('https://host/', '/path')).toBe('https://host/path');
    expect(joinUrl('https://host', 'path')).toBe('https://host/path');
    expect(joinUrl('https://host/', '')).toBe('https://host');
  });
});

describe('escapeString', () => {
  it('doubles single quotes', () => {
    expect(escapeString("O'Brien")).toBe("O''Brien");
  });
});

describe('formatLiteral', () => {
  it('formats strings, numbers, booleans, null', () => {
    expect(formatLiteral('hi')).toBe("'hi'");
    expect(formatLiteral(42)).toBe('42');
    expect(formatLiteral(true)).toBe('true');
    expect(formatLiteral(null)).toBe('null');
    expect(formatLiteral(undefined)).toBe('null');
  });
  it('formats arrays as (a,b) for the in operator', () => {
    expect(formatLiteral(['a', 'b'])).toBe("('a','b')");
    expect(formatLiteral([1, 2])).toBe('(1,2)');
  });
  it('formats Dates as ISO', () => {
    const d = new Date('2026-01-02T03:04:05.000Z');
    expect(formatLiteral(d)).toBe('2026-01-02T03:04:05.000Z');
  });
  it('formats GUIDs unquoted (Edm.Guid)', () => {
    expect(formatLiteral('6045bda6-d096-1fd1-a182-fb78ac85c000')).toBe('6045bda6-d096-1fd1-a182-fb78ac85c000');
    expect(formatLiteral('6045BDA6-D096-1FD1-A182-FB78AC85C000')).toBe('6045BDA6-D096-1FD1-A182-FB78AC85C000');
  });
});

describe('buildEntityPath', () => {
  it('builds single-key path', () => {
    expect(buildEntityPath('Order', 'PO-1')).toBe("Order('PO-1')");
  });
  it('builds composite-key path', () => {
    expect(buildEntityPath('GoodsReceipt', { A: 1, B: 'x' })).toBe("GoodsReceipt(A=1,B='x')");
  });
  it('builds composite-key path with GUID unquoted', () => {
    expect(buildEntityPath('GoodsReceipt', {
      GoodsReceiptUUID: '6045bda6-d096-1fd1-a182-fb78ac85c000',
      IsActiveEntity: false,
    })).toBe("GoodsReceipt(GoodsReceiptUUID=6045bda6-d096-1fd1-a182-fb78ac85c000,IsActiveEntity=false)");
  });
  it('handles boolean key parts', () => {
    expect(buildEntityPath('GR', { Uuid: 'abc', IsActiveEntity: false }))
      .toBe("GR(Uuid='abc',IsActiveEntity=false)");
  });
  it('returns bare set name for null key', () => {
    expect(buildEntityPath('Order', null)).toBe('Order');
  });
});

describe('encodeODataValue', () => {
  it('encodes spaces as %20', () => {
    expect(encodeODataValue("a eq 'b'")).toBe("a%20eq%20'b'");
  });
  it('leaves quotes and parens literal', () => {
    expect(encodeODataValue("contains(Name,'x')")).toBe("contains(Name,'x')");
  });
  it('leaves commas literal', () => {
    expect(encodeODataValue('A,B,C')).toBe('A,B,C');
  });
});

describe('appendQueryParams', () => {
  it('appends with ? for a clean path', () => {
    expect(appendQueryParams('Order', { $top: 10 })).toBe('Order?$top=10');
  });
  it('appends with & when query already present', () => {
    expect(appendQueryParams('Order?$top=10', { $skip: 5 })).toBe('Order?$top=10&$skip=5');
  });
  it('skips undefined/null/empty params but keeps 0', () => {
    expect(appendQueryParams('Order', { $top: undefined, $skip: null, $count: '' }))
      .toBe('Order');
    expect(appendQueryParams('Order', { $skip: 0 })).toBe('Order?$skip=0');
  });
  it('keeps $count=true', () => {
    expect(appendQueryParams('Order', { $count: 'true' })).toBe('Order?$count=true');
  });
});

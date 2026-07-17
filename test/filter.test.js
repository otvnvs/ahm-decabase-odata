import { describe, it, expect } from 'vitest';
import { FilterBuilder, resolveFilter } from '../src/core/filter.js';

describe('FilterBuilder comparisons', () => {
  const f = new FilterBuilder('v4');
  it('eq with proper spacing', () => {
    expect(f.eq('PurchaseOrder', 'PO-1')).toBe("PurchaseOrder eq 'PO-1'");
  });
  it('ne, gt, ge, lt, le', () => {
    expect(f.ne('Qty', 0)).toBe('Qty ne 0');
    expect(f.gt('Qty', 0)).toBe('Qty gt 0');
    expect(f.ge('Qty', 0)).toBe('Qty ge 0');
    expect(f.lt('Qty', 100)).toBe('Qty lt 100');
    expect(f.le('Qty', 100)).toBe('Qty le 100');
  });
  it('escapes quotes in string values', () => {
    expect(f.eq('Name', "O'Brien")).toBe("Name eq 'O''Brien'");
  });
});

describe('FilterBuilder combinators', () => {
  const f = new FilterBuilder('v4');
  it('and joins expressions', () => {
    expect(f.and(f.eq('A', 1), f.gt('B', 0))).toBe("(A eq 1 and B gt 0)");
  });
  it('or joins expressions', () => {
    expect(f.or(f.eq('A', 1), f.eq('A', 2))).toBe("(A eq 1 or A eq 2)");
  });
  it('not wraps an expression', () => {
    expect(f.not(f.eq('A', 1))).toBe('not(A eq 1)');
  });
  it('single-arg and returns the expression unwrapped', () => {
    expect(f.and(f.eq('A', 1))).toBe('A eq 1');
  });
  it('nested combinators', () => {
    const expr = f.and(f.eq('PO', 'X'), f.or(f.gt('Qty', 0), f.eq('Status', 'OPEN')));
    expect(expr).toBe("(PO eq 'X' and (Qty gt 0 or Status eq 'OPEN'))");
  });
});

describe('FilterBuilder functions', () => {
  it('v4 contains', () => {
    const f = new FilterBuilder('v4');
    expect(f.contains('Name', 'abc')).toBe("contains(Name,'abc')");
  });
  it('v2 contains maps to substringof with reversed args', () => {
    const f = new FilterBuilder('v2');
    expect(f.contains('Name', 'abc')).toBe("substringof('abc',Name)");
  });
  it('startswith / endswith', () => {
    const f = new FilterBuilder('v4');
    expect(f.startswith('Name', 'A')).toBe("startswith(Name,'A')");
    expect(f.endswith('Name', 'Z')).toBe("endswith(Name,'Z')");
  });
  it('in operator', () => {
    const f = new FilterBuilder('v4');
    expect(f.in('Status', ['OPEN', 'PEND'])).toBe("Status in ('OPEN','PEND')");
    expect(f.in('Status', [])).toBe('');
  });
});

describe('resolveFilter', () => {
  it('passes strings through', () => {
    expect(resolveFilter("A eq 1", 'v4')).toBe('A eq 1');
  });
  it('resolves callbacks', () => {
    expect(resolveFilter(b => b.eq('A', 1), 'v4')).toBe('A eq 1');
  });
  it('returns empty for falsy', () => {
    expect(resolveFilter(null, 'v4')).toBe('');
    expect(resolveFilter('', 'v4')).toBe('');
  });
});

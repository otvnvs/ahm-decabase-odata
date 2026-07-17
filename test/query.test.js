import { describe, it, expect } from 'vitest';
import { ODataQuery } from '../src/core/query.js';

describe('ODataQuery', () => {
  it('builds $select', () => {
    const q = new ODataQuery('v4').select('Id', 'Name');
    expect(q.toParams()).toEqual({ $select: 'Id,Name' });
  });

  it('builds $expand with strings', () => {
    const q = new ODataQuery('v4').expand('Items', 'Plant');
    expect(q.toParams()).toEqual({ $expand: 'Items,Plant' });
  });

  it('builds $expand with nested options', () => {
    const q = new ODataQuery('v4').expand({
      path: 'Items',
      select: ['Material', 'OpenQuantity'],
      filter: b => b.gt('OpenQuantity', 0),
      top: 5,
    });
    expect(q.toParams().$expand).toBe("Items($select=Material,OpenQuantity;$filter=OpenQuantity gt 0;$top=5)");
  });

  it('builds $filter from callback', () => {
    const q = new ODataQuery('v4').filter(b => b.eq('PurchaseOrder', 'PO-1'));
    expect(q.toParams().$filter).toBe("PurchaseOrder eq 'PO-1'");
  });

  it('builds $orderby from mixed specs', () => {
    const q = new ODataQuery('v4').orderby('Date desc', { field: 'Id', desc: false });
    expect(q.toParams().$orderby).toBe('Date desc,Id asc');
  });

  it('builds paging', () => {
    const q = new ODataQuery('v4').top(10).skip(20);
    expect(q.toParams()).toEqual({ $top: 10, $skip: 20 });
  });

  it('builds $count and $search', () => {
    const q = new ODataQuery('v4').count().search('hello');
    expect(q.toParams().$count).toBe('true');
    expect(q.toParams().$search).toBe('"hello"');
  });

  it('escapes double quotes in $search', () => {
    const q = new ODataQuery('v4').search('he said "hi"');
    expect(q.toParams().$search).toBe('"he said ""hi"""');
  });

  it('combines all options', () => {
    const q = new ODataQuery('v4')
      .select('Id')
      .expand('Items')
      .filter(b => b.eq('Id', 1))
      .orderby('Id')
      .top(5);
    expect(q.toParams()).toEqual({
      $select: 'Id',
      $expand: 'Items',
      $filter: 'Id eq 1',
      $orderby: 'Id',
      $top: 5,
    });
  });
});

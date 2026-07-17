// OData v2 protocol adapter.
// v2 collection responses: { d: { results: [...], __count?, __next? } }
// v2 single entities: { d: { ... } }
// v2 requires $format=json to get JSON instead of Atom XML.

export const v2Adapter = {
  version: 'v2',
  defaultParams: { $format: 'json' },

  parseCollection(body) {
    if (body == null) return { value: [], count: null, nextLink: null };
    const d = body.d ?? body;
    const value = Array.isArray(d) ? d : (d.results ?? []);
    return {
      value,
      count: d.__count != null ? Number(d.__count) : null,
      nextLink: d.__next ?? null,
    };
  },

  parseSingle(body) {
    if (body == null) return null;
    return body.d ?? body;
  },
};

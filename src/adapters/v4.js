// OData v4 protocol adapter.
// v4 collection responses: { value: [...], '@odata.count'?, '@odata.nextLink'? }
// v4 single entities: the object itself.

export const v4Adapter = {
  version: 'v4',
  defaultParams: {},

  parseCollection(body) {
    if (body == null) return { value: [], count: null, nextLink: null };
    const value = Array.isArray(body) ? body : (body.value ?? []);
    return {
      value,
      count: body['@odata.count'] ?? null,
      nextLink: body['@odata.nextLink'] ?? null,
    };
  },

  parseSingle(body) {
    if (body == null) return null;
    return body;
  },
};

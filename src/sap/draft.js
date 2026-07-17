// Generic SAP RAP draft pipeline.
// Orchestrates the create-header -> add-items -> activate-draft sequence used by
// SAP draft-enabled services, without coupling to any specific entity.
//
// Usage:
//   const draft = new DraftPipeline(sapClient, 'GoodsReceipt', 'GoodsReceiptUUID');
//   await draft.createHeader({ PurchaseOrder: 'PO-1', PostingDate: '2026-06-22' });
//   await draft.addItem('_Item', { PurchaseOrderItem: '00010', Material: 'M1' });
//   await draft.activate('com.sap.gateway.srvd_a2x.zgr_ui_grdoc_o4.v0001.Activate');

export class DraftPipeline {
  /**
   * @param {import('../core/client.js').ODataClient} client
   * @param {string} entitySet  draft-enabled entity set name
   * @param {string} keyField    field holding the draft UUID returned by createHeader
   */
  constructor(client, entitySet, keyField) {
    this.client = client;
    this.entitySet = entitySet;
    this.keyField = keyField;
    this.draftKey = null;
  }

  /** POST the draft header and capture the draft UUID key. */
  async createHeader(body) {
    const created = await this.client.entitySet(this.entitySet).create(body);
    const uuid = created?.[this.keyField];
    if (uuid === undefined || uuid === null) {
      throw new Error(`Draft header response did not contain ${this.keyField}`);
    }
    this.draftKey = { [this.keyField]: uuid, IsActiveEntity: false };
    return created;
  }

  /** POST a draft item to a navigation property of the draft header. */
  async addItem(navigationProperty, body) {
    this._requireHeader();
    return this.client.entitySet(this.entitySet).nav(this.draftKey, navigationProperty).create(body);
  }

  /** Invoke the bound activation action on the draft header. */
  async activate(actionName) {
    this._requireHeader();
    return this.client.entitySet(this.entitySet).callAction(this.draftKey, actionName, {});
  }

  /**
   * Run the full pipeline in one call.
   * @param {object} opts
   * @param {object} opts.header  body for the draft header
   * @param {Array<{nav: string, body: object}>} [opts.items]  draft items
   * @param {string} opts.action  bound action name to activate
   */
  async run({ header, items = [], action }) {
    const created = await this.createHeader(header);
    for (const item of items) {
      await this.addItem(item.nav, item.body);
    }
    return this.activate(action);
  }

  _requireHeader() {
    if (!this.draftKey) {
      throw new Error('createHeader() must be called before addItem()/activate()');
    }
  }
}

// Seed data + helpers for the WorkflowItems mock entity set.
// Fields: ID, Title, Assignee, Status, Priority, DueDate.

export const STATUSES = ['Open', 'InProgress', 'Pending', 'Done'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

const SEED = [
  { ID: 1, Title: 'Approve purchase order 4500000001', Assignee: 'A. Mokoena', Status: 'Open', Priority: 'High', DueDate: '2026-07-19' },
  { ID: 2, Title: 'Review goods receipt for PO 4500000002', Assignee: 'J. Singh', Status: 'InProgress', Priority: 'Medium', DueDate: '2026-07-21' },
  { ID: 3, Title: 'Verify vendor master for Acme Corp', Assignee: 'L. Ferreira', Status: 'Pending', Priority: 'Low', DueDate: '2026-07-25' },
  { ID: 4, Title: 'Confirm stock transfer order 4500000003', Assignee: 'A. Mokoena', Status: 'Open', Priority: 'Medium', DueDate: '2026-07-20' },
  { ID: 5, Title: 'Reconcile invoice 5100000123', Assignee: 'R. Nakamura', Status: 'Done', Priority: 'High', DueDate: '2026-07-15' },
  { ID: 6, Title: 'Inspect damaged shipment GR-8842', Assignee: 'J. Singh', Status: 'Open', Priority: 'High', DueDate: '2026-07-18' },
  { ID: 7, Title: 'Update material master for MAT-2210', Assignee: 'L. Ferreira', Status: 'InProgress', Priority: 'Low', DueDate: '2026-07-28' },
  { ID: 8, Title: 'Release blocked invoice 5100000130', Assignee: 'R. Nakamura', Status: 'Pending', Priority: 'Medium', DueDate: '2026-07-23' },
  { ID: 9, Title: 'Confirm service entry sheet 900000112', Assignee: 'A. Mokoena', Status: 'Open', Priority: 'Low', DueDate: '2026-07-30' },
  { ID: 10, Title: 'Archive completed goods movements', Assignee: 'J. Singh', Status: 'Done', Priority: 'Low', DueDate: '2026-07-12' },
];

/** Deep clone of the seed array so callers can mutate freely. */
export function seedWorkflowItems() {
  return SEED.map((row) => ({ ...row }));
}

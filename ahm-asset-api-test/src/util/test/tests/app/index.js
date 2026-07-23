export default async function runSuite(runner) {
  await runner.describe('Native Sandbox File System', async (expect) => {
    const folder = 'testing_sandbox_root';
    const file = `${folder}/manifest.json`;

    const mkdirRes = await fetch(`/api/fs/mkdir?path=${folder}&recursive=true`, { method: 'POST' });
    expect.equal(mkdirRes.status, 200, 'POST /mkdir generates workspace layout folders');

    const writeRes = await fetch(`/api/fs/write?path=${file}&content=${encodeURIComponent('{"active":true}')}`, { method: 'POST' });
    expect.equal(writeRes.status, 200, 'POST /write persists raw buffers to disk storage context');

    // Query and dump directory listings to show file state on phone storage
    const listRes = await fetch(`/api/fs/list?path=${folder}`);
    expect.equal(listRes.status, 200, 'GET /list reads target storage layout directory');
    if (listRes.ok) {
      const listData = await listRes.json();
    }
  });
}


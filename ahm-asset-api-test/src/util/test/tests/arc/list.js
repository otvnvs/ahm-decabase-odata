export default async function runSuite(runner) {
    await runner.describe('ArcController Paginated Index Listing Matrix', async (expect) => {
        const sourceDir = 'arc_list_source_workspace';
        const archiveZipPath = 'arc_list_payload.zip';
        
        const subFolder1 = `${sourceDir}/documents`;
        const subFolder2 = `${sourceDir}/images`;

        // Clean up workspace remnants before running
        await fetch(`/api/fs/delete?path=${encodeURIComponent(sourceDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(archiveZipPath)}&recursive=false`, { method: 'DELETE' });

        // ==========================================
        // 1. ENVIRONMENT SEEDING PHASE
        // ==========================================
        expect.log('[PREPARE] Creating multi-directory source structure tree nodes...');
        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(subFolder1)}&recursive=true`, { method: 'POST' });
        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(subFolder2)}&recursive=true`, { method: 'POST' });

        expect.log('[PREPARE] Seeding file assets under separate directory paths...');
        await fetch(`/api/fs/write?path=${encodeURIComponent(`${subFolder1}/report1.txt`)}`, { method: 'POST', body: 'Report doc content 1' });
        await fetch(`/api/fs/write?path=${encodeURIComponent(`${subFolder1}/report2.txt`)}`, { method: 'POST', body: 'Report doc content 2' });
        await fetch(`/api/fs/write?path=${encodeURIComponent(`${subFolder1}/report3.txt`)}`, { method: 'POST', body: 'Report doc content 3' });
        await fetch(`/api/fs/write?path=${encodeURIComponent(`${subFolder2}/graphic.png`)}`, { method: 'POST', body: 'Binary image buffer abstraction string' });

        expect.log('[EXECUTE] Building seed ZIP archive layout target on local disk...');
        await fetch('/api/arc/zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourcePath: sourceDir, targetZipPath: archiveZipPath })
        });

        // ==========================================
        // 2. TEST CASE 1: Baseline Full Unfiltered List
        // ==========================================
        expect.log('[EXECUTE] Requesting global baseline archive listing index...');
        const resFull = await fetch('/api/arc/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zipPath: archiveZipPath, offset: 0, limit: 100 })
        });

        expect.equal(resFull.status, 200, 'POST /api/arc/list returns status 200 on safe source validation tracking check');
        const jsonFull = await resFull.json();
        
        expect.equal(jsonFull.totalMatching, 4, 'Total index count correctly inventories full file layout boundaries in target zip');
        expect.equal(jsonFull.count, 4, 'Item pagination response count returns full asset metrics bounds');

        // FIX: Extract the first individual record structure object from index slot 0
        const firstEntry = jsonFull.entries[0];
        expect.equal(typeof firstEntry.name, 'string', 'Entry schema item holds valid string descriptor mapping string');
        expect.equal(typeof firstEntry.isDirectory, 'boolean', 'Entry schema item holds valid boolean type folder tracking flags');


        // ==========================================
        // 3. TEST CASE 2: Directory Prefix Folder Scoping
        // ==========================================
        expect.log('[EXECUTE] Testing directoryPrefix filter targeting exclusively: "documents"');
        const resFolder = await fetch('/api/arc/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                zipPath: archiveZipPath, 
                directoryPrefix: 'documents',
                offset: 0,
                limit: 100
            })
        });

        expect.equal(resFolder.status, 200, 'POST /api/arc/list directory prefix slice request handles filter validation cleanly');
        const jsonFolder = await resFolder.json();

        expect.equal(jsonFolder.totalMatching, 3, 'Directory isolation algorithm extracts exactly matching subdirectory leaf nodes');
        
        let prefixVerificationPassed = true;
        jsonFolder.entries.forEach(entry => {
            if (!entry.name.startsWith('documents/')) prefixVerificationPassed = false;
        });
        expect.equal(prefixVerificationPassed, true, 'All returned items are verified to reside inside targeted branch stem directory');

        // ==========================================
        // 4. TEST CASE 3: Offset & Limit Pagination Slicing
        // ==========================================
        expect.log('[EXECUTE] Testing pagination chunk parameters: offset=1, limit=2 inside "documents"');
        const resPage = await fetch('/api/arc/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                zipPath: archiveZipPath, 
                directoryPrefix: 'documents',
                offset: 1,  
                limit: 2    
            })
        });

        expect.equal(resPage.status, 200, 'POST /api/arc/list pagination limits parameters execute flawlessly');
        const jsonPage = await resPage.json();
        
        expect.equal(jsonPage.totalMatching, 3, 'Overall total matching tracker maintains overall scope total correctly');
        expect.equal(jsonPage.count, 2, 'Paged count slice limits window response payload size precisely to limit bounds');
        // ==========================================
        // 5. TEARDOWN ENV CLEANUP PURGE
        // ==========================================
        expect.log('[CLEANUP] Wiping generated testing layout nodes from workspace directory tree...');
        await fetch(`/api/fs/delete?path=${encodeURIComponent(sourceDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(archiveZipPath)}&recursive=false`, { method: 'DELETE' });
    });
}


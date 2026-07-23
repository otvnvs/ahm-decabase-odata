export default async function runSuite(runner) {
    await runner.describe('ArcController Path Component Stripping Matrix', async (expect) => {
        const sourceDir = 'arc_strip_source_workspace';
        const archiveZipPath = 'arc_strip_payload.zip';
        const targetStripExtractDir = 'arc_strip_extracted_out';
        
        const nestedSourceDir = `${sourceDir}/nested_tier_wrapper`;
        const stripTestFilePath = `${nestedSourceDir}/stripped_target.txt`;
        const stripTestContent = 'Payload container to verify tar-style root level directory lifting functionality.';

        // Clean workspace prior to script execution
        await fetch(`/api/fs/delete?path=${encodeURIComponent(sourceDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(targetStripExtractDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(archiveZipPath)}&recursive=false`, { method: 'DELETE' });

        // 1. Setup deep directory nesting structure
        expect.log(`[PREPARE] Creating isolated nested directory tree layout at: ${nestedSourceDir}`);
        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(nestedSourceDir)}&recursive=true`, { method: 'POST' });

        expect.log(`[PREPARE] Committing sample file deep inside target directory layout: ${stripTestFilePath}`);
        await fetch(`/api/fs/write?path=${encodeURIComponent(stripTestFilePath)}`, { method: 'POST', body: stripTestContent });

        // 2. Compress the target structure
        const zipPayload = { sourcePath: sourceDir, targetZipPath: archiveZipPath };
        expect.log(`[EXECUTE] Packing folder matrix structure into single binary zip archive location...`);
        const zipRes = await fetch('/api/arc/zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zipPayload)
        });
        expect.equal(zipRes.status, 200, 'POST /api/arc/zip compiles binary format layout block cleanly');

        // 3. Trigger unzip with stripComponents: 1
        const stripUnzipPayload = {
            zipPath: archiveZipPath,
            targetDirectory: targetStripExtractDir,
            stripComponents: 1 // Strips 'nested_tier_wrapper/', lifting 'stripped_target.txt' straight to root
        };

        expect.log(`[EXECUTE] Requesting extraction into "${targetStripExtractDir}" with parameter stripComponents: 1`);
        const stripUnzipResponse = await fetch('/api/arc/unzip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stripUnzipPayload)
        });

        expect.equal(stripUnzipResponse.status, 200, 'POST /api/arc/unzip returns operational status 200 on extraction payload');
        const stripUnzipJson = await stripUnzipResponse.json();
        expect.equal(stripUnzipJson.componentsStripped, 1, 'API confirms compliance with the stripping depth parameter setting');

        // 4. FIX: Expect the asset to be lifted directly to the root output folder due to compression layout
        const liftedNestedFilePath = `${targetStripExtractDir}/stripped_target.txt`;
        expect.log(`[VERIFY] Testing target disk storage path for presence of lifted asset file stream: ${liftedNestedFilePath}`);
        
        const checkLiftedNestedRes = await fetch(`/api/fs/read?path=${encodeURIComponent(liftedNestedFilePath)}`);
        expect.equal(checkLiftedNestedRes.status, 200, 'Target file lifted straight up to extraction root as first tier directory component dropped');
        
        if (checkLiftedNestedRes.ok) {
            const liftedTxt = await checkLiftedNestedRes.text();
            expect.equal(liftedTxt, stripTestContent, 'Lifted asset stream validation integrity matches source buffer block precisely');
        }
        // 5. Execution Environment Teardown Purge (Restored for clean environment states)
        expect.log(`[CLEANUP] Cleaning workspace nodes...`);
        await fetch(`/api/fs/delete?path=${encodeURIComponent(sourceDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(targetStripExtractDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(archiveZipPath)}&recursive=false`, { method: 'DELETE' });
    });
}


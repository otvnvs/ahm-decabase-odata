export default async function runSuite(runner) {
    await runner.describe('ArcController Multi-Tier Strip Components Complexity Matrix', async (expect) => {
        const sourceRoot = 'arc_complex_strip_workspace';
        const archiveZip = 'arc_complex_strip_payload.zip';
        const extractDir = 'arc_complex_strip_extracted_out';

        // Content strings for validation
        const rootContent = 'Root level item tracking matrix marker.';
        const shallowContent = 'Shallow folder asset layout confirmation data.';
        const deepContent1 = 'Deep node validation text element stream segment Alpha.';
        const deepContent2 = 'Deep node validation text element stream segment Beta.';

        // Clean up any stale artifacts before starting
        await fetch(`/api/fs/delete?path=${encodeURIComponent(sourceRoot)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(extractDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(archiveZip)}&recursive=false`, { method: 'DELETE' });

        // ==========================================
        // 1. GENERATE COMPLEX SOURCE FILE TREE MATRIX
        // ==========================================
        expect.log('[PREPARE] Constructing complex multi-tier source layout structural nodes...');
        
        // Tier 0: Direct files under the source root directory
        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(sourceRoot)}&recursive=true`, { method: 'POST' });
        await fetch(`/api/fs/write?path=${encodeURIComponent(`${sourceRoot}/root_file.txt`)}`, { method: 'POST', body: rootContent });

        // Tier 1: Sibling directories directly inside the source root folder
        const branchA = `${sourceRoot}/branch_A`;
        const branchB = `${sourceRoot}/branch_B`;
        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(branchA)}&recursive=true`, { method: 'POST' });
        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(branchB)}&recursive=true`, { method: 'POST' });
        await fetch(`/api/fs/write?path=${encodeURIComponent(`${branchA}/shallow_file.txt`)}`, { method: 'POST', body: shallowContent });

        // Tier 2 & 3: Deep nested hierarchies inside branch_A and branch_B
        const deepPathA = `${branchA}/level_2/level_3`;
        const deepPathB = `${branchB}/category_data/records`;
        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(deepPathA)}&recursive=true`, { method: 'POST' });
        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(deepPathB)}&recursive=true`, { method: 'POST' });

        const deepFileA = `${deepPathA}/target_alpha.txt`;
        const deepFileB = `${deepPathB}/target_beta.json`;
        await fetch(`/api/fs/write?path=${encodeURIComponent(deepFileA)}`, { method: 'POST', body: deepContent1 });
        await fetch(`/api/fs/write?path=${encodeURIComponent(deepFileB)}`, { method: 'POST', body: deepContent2 });

        // ==========================================
        // 2. RE-PACK COMPLEX STRUCTURE INTO ZIP ARCHIVE
        // ==========================================
        expect.log('[EXECUTE] Executing compression wrapper payload routine...');
        const zipRes = await fetch('/api/arc/zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourcePath: sourceRoot, targetZipPath: archiveZip })
        });
        expect.equal(zipRes.status, 200, 'POST /api/arc/zip captures complex multi-tier filesystem layouts flawlessly');

        // ==========================================
        // 3. DECOMPRESS WITH STRIP COMPONENTS = 2
        // ==========================================
        // Due to URI relativization:
        // - "sourceRoot/root_file.txt" is saved inside the ZIP as "root_file.txt" (1 component -> should be dropped)
        // - "sourceRoot/branch_A/shallow_file.txt" is saved as "branch_A/shallow_file.txt" (2 components -> should be dropped)
        // - "sourceRoot/branch_A/level_2/level_3/target_alpha.txt" is saved as "branch_A/level_2/level_3/target_alpha.txt"
        //   Stripping 2 levels removes "branch_A/level_2/", leaving "level_3/target_alpha.txt"
        // - "sourceRoot/branch_B/category_data/records/target_beta.json" is saved as "branch_B/category_data/records/target_beta.json"
        //   Stripping 2 levels removes "branch_B/category_data/", leaving "records/target_beta.json"
        
        expect.log(`[EXECUTE] Requesting extraction into "${extractDir}" with high-depth parameter stripComponents: 2`);
        const unzipResponse = await fetch('/api/arc/unzip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                zipPath: archiveZip,
                targetDirectory: extractDir,
                stripComponents: 2
            })
        });
        expect.equal(unzipResponse.status, 200, 'POST /api/arc/unzip processes structural stripping transformation safely');

        // ==========================================
        // 4. VERIFY DROP UTILITIES (SHALLOW COMPONENT DISCARDING)
        // ==========================================
        expect.log('[VERIFY] Confirming that shallow components matching or under stripping depth were correctly dropped...');
        
        const checkDroppedRootRes = await fetch(`/api/fs/read?path=${encodeURIComponent(`${extractDir}/root_file.txt`)}`);
        expect.equal(checkDroppedRootRes.status, 404, 'Root level asset item discarded completely from storage stack layout');

        const checkDroppedShallowRes = await fetch(`/api/fs/read?path=${encodeURIComponent(`${extractDir}/shallow_file.txt`)}`);
        expect.equal(checkDroppedShallowRes.status, 404, 'Shallow branch folder asset dropped completely under level constraints');

        // ==========================================
        // 5. VERIFY LIFT OPERATIONS (DEEP STRUCTURE LIFTING)
        // ==========================================
        expect.log('[VERIFY] Confirming that deep elements were successfully lifted up by two full folder tiers...');
        
        // Expected destination path: extractDir + "level_3/target_alpha.txt"
        const liftedPathA = `${extractDir}/level_3/target_alpha.txt`;
        const readAlphaRes = await fetch(`/api/fs/read?path=${encodeURIComponent(liftedPathA)}`);
        expect.equal(readAlphaRes.status, 200, 'First deep target node found successfully shifted up by two levels');
        if (readAlphaRes.ok) {
            const txtA = await readAlphaRes.text();
            expect.equal(txtA, deepContent1, 'First lifted file content validation integrity matches precisely');
        }

        // Expected destination path: extractDir + "records/target_beta.json"
        const liftedPathB = `${extractDir}/records/target_beta.json`;
        const readBetaRes = await fetch(`/api/fs/read?path=${encodeURIComponent(liftedPathB)}`);
        expect.equal(readBetaRes.status, 200, 'Second deep target node from separate root sibling branch recovered successfully');
        if (readBetaRes.ok) {
            const txtB = await readBetaRes.text();
            expect.equal(txtB, deepContent2, 'Second lifted file content validation integrity matches precisely');
        }
        // ==========================================
        // 6. TEARDOWN ENV PURGE
        // ==========================================
        expect.log('[CLEANUP] Tearing down complex environment test matrix nodes...');
        await fetch(`/api/fs/delete?path=${encodeURIComponent(sourceRoot)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(extractDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(archiveZip)}&recursive=false`, { method: 'DELETE' });
    });
}


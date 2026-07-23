export default async function runSuite(runner) {
    await runner.describe('ArcController Core API Baseline Verification', async (expect) => {
        const sourceDir = 'arc_basic_source_dir';
        const targetExtractDir = 'arc_basic_extracted_out';
        const file1Path = `${sourceDir}/note.txt`;
        const archiveZipPath = 'arc_basic_payload.zip';
        const file1Content = 'Verification string inside an archival unit test matrix.';

        await fetch(`/api/fs/delete?path=${encodeURIComponent(sourceDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(targetExtractDir)}&recursive=true`, { method: 'DELETE' });
        await fetch(`/api/fs/delete?path=${encodeURIComponent(archiveZipPath)}&recursive=false`, { method: 'DELETE' });

        await fetch(`/api/fs/mkdir?path=${encodeURIComponent(sourceDir)}&recursive=true`, { method: 'POST' });
        await fetch(`/api/fs/write?path=${encodeURIComponent(file1Path)}`, { method: 'POST', body: file1Content });

        const zipResponse = await fetch('/api/arc/zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourcePath: sourceDir, targetZipPath: archiveZipPath })
        });
        expect.equal(zipResponse.status, 200, 'POST /api/arc/zip executes successfully');

        const unzipResponse = await fetch('/api/arc/unzip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zipPath: archiveZipPath, targetDirectory: targetExtractDir })
        });
        expect.equal(unzipResponse.status, 200, 'POST /api/arc/unzip unpacks cleanly');

        const checkFile1Res = await fetch(`/api/fs/read?path=${encodeURIComponent(`${targetExtractDir}/note.txt`)}`);
        expect.equal(checkFile1Res.status, 200, 'Extracted file accessible at target destination folder root');

        //await fetch(`/api/fs/delete?path=${encodeURIComponent(sourceDir)}&recursive=true`, { method: 'DELETE' });
        //await fetch(`/api/fs/delete?path=${encodeURIComponent(targetExtractDir)}&recursive=true`, { method: 'DELETE' });
        //await fetch(`/api/fs/delete?path=${encodeURIComponent(archiveZipPath)}&recursive=false`, { method: 'DELETE' });
    });
}


export default async function runSuite(runner) {
  await runner.describe('Refactoring Test Suite', async (expect) => {
       expect.equal(1, 1, 'Stub');
  });
}

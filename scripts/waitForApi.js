const HEALTH_URL = 'http://127.0.0.1:5001/api/health';
const EXPECTED_DATABASE = 'sapes_dev';
const TIMEOUT_MS = 120_000;
const RETRY_INTERVAL_MS = 500;

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitForApi = async () => {
  const deadline = Date.now() + TIMEOUT_MS;
  let lastStatus = 'API is not reachable yet';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(HEALTH_URL, {
        signal: AbortSignal.timeout(2_000)
      });
      const health = await response.json().catch(() => null);

      if (
        response.ok
        && health?.status === 'ok'
        && health.database === EXPECTED_DATABASE
      ) {
        console.log(`API connected to ${EXPECTED_DATABASE}; starting client.`);
        return;
      }

      lastStatus = `API health check returned HTTP ${response.status} for database ${health?.database || 'unknown'}`;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await delay(RETRY_INTERVAL_MS);
  }

  throw new Error(`API did not become ready within ${TIMEOUT_MS / 1000} seconds: ${lastStatus}`);
};

waitForApi().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

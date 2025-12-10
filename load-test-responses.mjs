// Simple load test script for /api/responses
// Usage (example):
//   BASE_URL="https://your-app.vercel.app" \
//   STUDENT_EMAIL="student@example.com" \
//   STUDENT_ID="student_123" \
//   FORM_ID="form_abc" \
//   RATINGS_JSON='{"param1":10,"param2":8}' \
//   CONCURRENCY=2000 \
//   node load-test-responses.mjs
//
// NOTE: This script assumes Node 18+ (built-in fetch).

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const STUDENT_EMAIL = process.env.STUDENT_EMAIL;
const STUDENT_ID = process.env.STUDENT_ID;
const FORM_ID = process.env.FORM_ID;
const RATINGS_JSON = process.env.RATINGS_JSON;
const CONCURRENCY = Number(process.env.CONCURRENCY || 2000);

if (!STUDENT_EMAIL || !STUDENT_ID || !FORM_ID || !RATINGS_JSON) {
  console.error('Missing required env vars. Set STUDENT_EMAIL, STUDENT_ID, FORM_ID, RATINGS_JSON.');
  process.exit(1);
}

let ratings;
try {
  ratings = JSON.parse(RATINGS_JSON);
} catch (err) {
  console.error('RATINGS_JSON must be valid JSON. Example: {"paramId1":10,"paramId2":8}');
  process.exit(1);
}

async function sendRequest(index) {
  const body = {
    formId: FORM_ID,
    studentId: STUDENT_ID,
    ratings,
    comment: `Load test submission #${index}`,
  };

  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': STUDENT_EMAIL,
    },
    body: JSON.stringify(body),
  });
  const duration = Date.now() - start;

  let payload;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  return { status: res.status, duration, payload };
}

async function main() {
  console.log(`Starting load test against ${BASE_URL} with ${CONCURRENCY} concurrent requests...`);

  const startedAt = Date.now();
  const promises = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    promises.push(sendRequest(i + 1));
  }

  const results = await Promise.allSettled(promises);
  const totalTime = Date.now() - startedAt;

  const summary = {
    total: results.length,
    fulfilled: 0,
    rejected: 0,
    byStatus: {},
    p95LatencyMs: null,
    maxLatencyMs: 0,
    totalTimeMs: totalTime,
  };

  const latencies = [];

  for (const r of results) {
    if (r.status === 'rejected') {
      summary.rejected++;
      continue;
    }
    summary.fulfilled++;
    const { status, duration } = r.value;
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
    latencies.push(duration);
    if (duration > summary.maxLatencyMs) summary.maxLatencyMs = duration;
  }

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    const idx = Math.floor(0.95 * (latencies.length - 1));
    summary.p95LatencyMs = latencies[idx];
  }

  console.log('Load test summary:');
  console.log(JSON.stringify(summary, null, 2));

  const sampleError = results.find(
    r => r.status === 'fulfilled' && r.value.status >= 400
  );
  if (sampleError && sampleError.status === 'fulfilled') {
    console.log('\nSample error response:', sampleError.value);
  }
}

main().catch(err => {
  console.error('Load test failed with unexpected error:', err);
  process.exit(1);
});

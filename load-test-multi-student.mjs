// Realistic load test: different students submitting to the same form
// Usage:
//   BASE_URL="http://localhost:3000" \
//   ADMIN_EMAIL="admin@example.com" \
//   FORM_ID="form_abc" \
//   RATINGS_JSON='{"param1":10,"param2":8}' \
//   CONCURRENCY=200 \
//   node load-test-multi-student.mjs

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FORM_ID = process.env.FORM_ID;
const RATINGS_JSON = process.env.RATINGS_JSON;
const CONCURRENCY = Number(process.env.CONCURRENCY || 200);

if (!ADMIN_EMAIL || !FORM_ID || !RATINGS_JSON) {
  console.error('Missing required env vars. Set ADMIN_EMAIL, FORM_ID, RATINGS_JSON.');
  process.exit(1);
}

let ratings;
try {
  ratings = JSON.parse(RATINGS_JSON);
} catch {
  console.error('RATINGS_JSON must be valid JSON.');
  process.exit(1);
}

async function fetchStudents() {
  console.log('Fetching students from API...');
  const res = await fetch(`${BASE_URL}/api/admin/students`, {
    headers: { 'x-user-email': ADMIN_EMAIL },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch students: ${res.status}`);
  }
  const students = await res.json();
  console.log(`Fetched ${students.length} students.`);
  return students;
}

async function sendRequest(student) {
  const body = {
    formId: FORM_ID,
    studentId: student.id,
    ratings,
    comment: `Load test from ${student.email}`,
  };

  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': student.email,
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

  return { status: res.status, duration, payload, email: student.email };
}

async function main() {
  const allStudents = await fetchStudents();

  if (allStudents.length === 0) {
    console.error('No students found. Import students first.');
    process.exit(1);
  }

  // Take up to CONCURRENCY students
  const students = allStudents.slice(0, CONCURRENCY);
  console.log(`\nStarting load test with ${students.length} different students against ${BASE_URL}...`);

  const startedAt = Date.now();
  const promises = students.map(s => sendRequest(s));
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

  console.log('\nLoad test summary:');
  console.log(JSON.stringify(summary, null, 2));

  // Show sample success
  const sampleSuccess = results.find(
    r => r.status === 'fulfilled' && r.value.status === 201
  );
  if (sampleSuccess && sampleSuccess.status === 'fulfilled') {
    console.log('\nSample success:', sampleSuccess.value);
  }

  // Show sample error
  const sampleError = results.find(
    r => r.status === 'fulfilled' && r.value.status >= 400
  );
  if (sampleError && sampleError.status === 'fulfilled') {
    console.log('\nSample error:', sampleError.value);
  }
}

main().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});

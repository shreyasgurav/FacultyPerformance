// Load test for faculty dashboard APIs
// Simulates many different faculty loading their dashboard at once
//
// Usage example:
//   BASE_URL="http://localhost:3000" \
//   ADMIN_EMAIL="shreyas.gurav@somaiya.edu" \
//   CONCURRENCY=100 \
//   node load-test-faculty-dashboard.mjs
//
// Requirements:
// - ADMIN_EMAIL must be an admin user in your system (for /api/admin/faculty).
// - Faculty must already be added to the system.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const CONCURRENCY = Number(process.env.CONCURRENCY || 50);

if (!ADMIN_EMAIL) {
  console.error('Missing required env var ADMIN_EMAIL.');
  process.exit(1);
}

async function fetchFaculty() {
  console.log('Fetching faculty from API...');
  const res = await fetch(`${BASE_URL}/api/admin/faculty`, {
    headers: { 'x-user-email': ADMIN_EMAIL },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch faculty: ${res.status}`);
  }
  const faculty = await res.json();
  console.log(`Fetched ${faculty.length} faculty.`);
  return faculty;
}

async function hitDashboardApis(faculty) {
  const headers = { 'x-user-email': faculty.email };
  const start = Date.now();

  const [facultyRes, formsRes, responsesRes] = await Promise.all([
    fetch(`${BASE_URL}/api/admin/faculty/${encodeURIComponent(faculty.id)}`, { headers }),
    fetch(`${BASE_URL}/api/admin/forms`, { headers }),
    fetch(`${BASE_URL}/api/responses`, { headers }),
  ]);

  const duration = Date.now() - start;

  return {
    email: faculty.email,
    facultyStatus: facultyRes.status,
    formsStatus: formsRes.status,
    responsesStatus: responsesRes.status,
    duration,
  };
}

async function main() {
  const allFaculty = await fetchFaculty();
  if (allFaculty.length === 0) {
    console.error('No faculty found. Add faculty first.');
    process.exit(1);
  }

  const faculty = allFaculty.slice(0, Math.min(CONCURRENCY, allFaculty.length));
  console.log(`\nStarting faculty dashboard API load test with ${faculty.length} faculty against ${BASE_URL}...`);

  const startedAt = Date.now();
  const promises = faculty.map(f => hitDashboardApis(f));
  const results = await Promise.allSettled(promises);
  const totalTime = Date.now() - startedAt;

  const summary = {
    totalFaculty: results.length,
    fulfilled: 0,
    rejected: 0,
    statuses: {
      faculty: {},
      forms: {},
      responses: {},
    },
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
    const { facultyStatus, formsStatus, responsesStatus, duration } = r.value;
    summary.statuses.faculty[facultyStatus] = (summary.statuses.faculty[facultyStatus] || 0) + 1;
    summary.statuses.forms[formsStatus] = (summary.statuses.forms[formsStatus] || 0) + 1;
    summary.statuses.responses[responsesStatus] = (summary.statuses.responses[responsesStatus] || 0) + 1;
    latencies.push(duration);
    if (duration > summary.maxLatencyMs) summary.maxLatencyMs = duration;
  }

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    const idx = Math.floor(0.95 * (latencies.length - 1));
    summary.p95LatencyMs = latencies[idx];
  }

  console.log('\nFaculty dashboard load test summary:');
  console.log(JSON.stringify(summary, null, 2));

  const sampleError = results.find(
    r => r.status === 'fulfilled' && (
      r.value.facultyStatus >= 400 ||
      r.value.formsStatus >= 400 ||
      r.value.responsesStatus >= 400
    )
  );

  if (sampleError && sampleError.status === 'fulfilled') {
    console.log('\nSample error:', sampleError.value);
  }
}

main().catch(err => {
  console.error('Faculty dashboard load test failed:', err);
  process.exit(1);
});


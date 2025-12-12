// Load test for student dashboard APIs
// Simulates many different students loading their dashboard at once
//
// Usage example:
//   BASE_URL="http://localhost:3000" \
//   ADMIN_EMAIL="shreyas.gurav@somaiya.edu" \
//   CONCURRENCY=500 \
//   node load-test-student-dashboard.mjs
//
// Requirements:
// - ADMIN_EMAIL must be an admin user in your system (for /api/admin/students).
// - Students must already be imported.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const CONCURRENCY = Number(process.env.CONCURRENCY || 200);

if (!ADMIN_EMAIL) {
  console.error('Missing required env var ADMIN_EMAIL.');
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

async function hitDashboardApis(student) {
  const headers = { 'x-user-email': student.email };
  const start = Date.now();

  const [studentRes, formsRes, responsesRes] = await Promise.all([
    fetch(`${BASE_URL}/api/admin/students/${encodeURIComponent(student.id)}`, { headers }),
    fetch(`${BASE_URL}/api/admin/forms`, { headers }),
    fetch(`${BASE_URL}/api/responses`, { headers }),
  ]);

  const duration = Date.now() - start;

  return {
    email: student.email,
    studentStatus: studentRes.status,
    formsStatus: formsRes.status,
    responsesStatus: responsesRes.status,
    duration,
  };
}

async function main() {
  const allStudents = await fetchStudents();
  if (allStudents.length === 0) {
    console.error('No students found. Import students first.');
    process.exit(1);
  }

  const students = allStudents.slice(0, Math.min(CONCURRENCY, allStudents.length));
  console.log(`\nStarting student dashboard API load test with ${students.length} students against ${BASE_URL}...`);

  const startedAt = Date.now();
  const promises = students.map(s => hitDashboardApis(s));
  const results = await Promise.allSettled(promises);
  const totalTime = Date.now() - startedAt;

  const summary = {
    totalStudents: results.length,
    fulfilled: 0,
    rejected: 0,
    statuses: {
      student: {},
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
    const { studentStatus, formsStatus, responsesStatus, duration } = r.value;
    summary.statuses.student[studentStatus] = (summary.statuses.student[studentStatus] || 0) + 1;
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

  console.log('\nStudent dashboard load test summary:');
  console.log(JSON.stringify(summary, null, 2));

  const sampleError = results.find(
    r => r.status === 'fulfilled' && (
      r.value.studentStatus >= 400 ||
      r.value.formsStatus >= 400 ||
      r.value.responsesStatus >= 400
    )
  );

  if (sampleError && sampleError.status === 'fulfilled') {
    console.log('\nSample error:', sampleError.value);
  }
}

main().catch(err => {
  console.error('Student dashboard load test failed:', err);
  process.exit(1);
});

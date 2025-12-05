import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Delete existing parameters
  await prisma.feedback_parameters.deleteMany({});

  // Insert new theory questions
  const theoryQuestions = [
    {
      id: 'theory_1',
      text: 'Interaction with students regarding the subject taught and query-handling during lectures',
      position: 1,
      form_type: 'theory',
      question_type: 'scale_3',
    },
    {
      id: 'theory_2',
      text: 'Number of numerical problems solved/case studies and practical applications discussed',
      position: 2,
      form_type: 'theory',
      question_type: 'scale_3',
    },
    {
      id: 'theory_3',
      text: 'Audibility and overall command on verbal communication',
      position: 3,
      form_type: 'theory',
      question_type: 'scale_3',
    },
    {
      id: 'theory_4',
      text: 'Command on the subject taught',
      position: 4,
      form_type: 'theory',
      question_type: 'scale_3',
    },
    {
      id: 'theory_5',
      text: 'Use of audio/visuals aids (e.g. OHP slides, LCD projector, PA system, charts, models etc.)',
      position: 5,
      form_type: 'theory',
      question_type: 'scale_3',
    },
    {
      id: 'theory_6',
      text: 'Whether the test-syllabus was covered satisfactorily before the term tests?',
      position: 6,
      form_type: 'theory',
      question_type: 'scale_3',
    },
    {
      id: 'theory_7',
      text: 'Evaluation of the faculty in the scale of 1-10',
      position: 7,
      form_type: 'theory',
      question_type: 'scale_1_10',
    },
  ];

  // Insert new lab questions
  const labQuestions = [
    {
      id: 'lab_1',
      text: 'The practical/tutorial sessions/assignments were well explained and planned to cover the syllabus thoroughly',
      position: 1,
      form_type: 'lab',
      question_type: 'yes_no',
    },
    {
      id: 'lab_2',
      text: 'The practical/tutorial sessions/assignments were useful for conceptual understanding of the topics',
      position: 2,
      form_type: 'lab',
      question_type: 'yes_no',
    },
    {
      id: 'lab_3',
      text: 'Evaluation of the faculty in the scale of 1-10',
      position: 3,
      form_type: 'lab',
      question_type: 'scale_1_10',
    },
  ];

  // Seed theory questions
  for (const q of theoryQuestions) {
    await prisma.feedback_parameters.upsert({
      where: { id: q.id },
      update: q,
      create: q,
    });
  }

  // Seed lab questions
  for (const q of labQuestions) {
    await prisma.feedback_parameters.upsert({
      where: { id: q.id },
      update: q,
      create: q,
    });
  }

  console.log('✅ Theory and Lab questions seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const params = await prisma.feedback_parameters.findMany({
    orderBy: { position: 'asc' },
  });
  
  console.log('All parameters in database:');
  console.log(JSON.stringify(params, null, 2));
  
  // Check theory params
  const theoryParams = await prisma.feedback_parameters.findMany({
    where: { form_type: 'theory' },
    orderBy: { position: 'asc' },
  });
  
  console.log('\nTheory parameters:');
  console.log(JSON.stringify(theoryParams, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

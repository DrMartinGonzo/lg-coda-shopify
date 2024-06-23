import { writeFileSync } from 'fs';

const IS_TEST_RELEASE = process.env.IS_TEST_RELEASE === 'true';
const CODA_PACK_ID = IS_TEST_RELEASE ? 32040 : 11612;

writeFileSync('pack-config.json', JSON.stringify({ IS_TEST_RELEASE, CODA_PACK_ID }));

writeFileSync(
  '.coda-pack.json',
  JSON.stringify({
    packId: CODA_PACK_ID,
    options: {
      timerStrategy: 'fake',
    },
  })
);

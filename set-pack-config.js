const fs = require('fs');

const IS_ADMIN_RELEASE = process.env.IS_ADMIN_RELEASE === 'true';
const CODA_PACK_ID = IS_ADMIN_RELEASE ? 11612 : 11612;

fs.writeFileSync('pack-config.json', JSON.stringify({ IS_ADMIN_RELEASE, CODA_PACK_ID }));

fs.writeFileSync(
  '.coda-pack.json',
  JSON.stringify({
    packId: CODA_PACK_ID,
    options: {
      timerStrategy: 'fake',
    },
  })
);

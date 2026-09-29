const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const root = __dirname;
const local = path.join(root, '.env.local');
const env = path.join(root, '.env');

if (fs.existsSync(local)) {
  dotenv.config({ path: local });
} else if (fs.existsSync(env)) {
  dotenv.config({ path: env });
}

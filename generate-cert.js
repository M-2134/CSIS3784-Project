const devcert = require('devcert');
const fs = require('fs');
const path = require('path');

(async () => {
  const { key, cert } = await devcert.certificateFor('localhost');
  const certDir = path.join(__dirname, 'frontend', 'certs');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
  fs.writeFileSync(path.join(certDir, 'cert.pem'), cert);
  fs.writeFileSync(path.join(certDir, 'key.pem'), key);
  console.log('Certificates generated in frontend/certs');
})();

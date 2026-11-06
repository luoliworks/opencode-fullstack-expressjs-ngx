import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import app from './app.js';

const PORT: number = Number(process.env.PORT) || 3000;
const HTTPS_PORT: number = Number(process.env.HTTPS_PORT) || 3443;

function getLanIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal) {
        ips.push(entry.address);
      }
    }
  }
  return ips;
}

const lanIps = getLanIps();

// Start HTTP server
http.createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP  server running at http://localhost:${PORT}`);
  for (const ip of lanIps) {
    console.log(`  -> LAN: http://${ip}:${PORT}`);
  }
});

// Start HTTPS server if certs/cert.key and certs/cert.pem exist
const certsDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certsDir, 'cert.key');
const certPath = path.join(certsDir, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const httpsOptions: https.ServerOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS server running at https://localhost:${HTTPS_PORT}`);
    for (const ip of lanIps) {
      console.log(`  -> LAN: https://${ip}:${HTTPS_PORT}`);
    }
  });
} else {
  console.log('HTTPS disabled (certs/cert.key or certs/cert.pem not found; run certs/encode.sh to generate)');
}

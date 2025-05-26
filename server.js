// server.js (contoh potongan untuk HTTPS/WSS, sesuaikan path sertifikat)
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https'); // Diperlukan untuk HTTPS
const fs = require('fs');       // Diperlukan untuk membaca sertifikat

const app = express();
app.use(express.static(path.join(__dirname, 'public'))); // Sajikan file statis

// Konfigurasi HTTPS/WSS
// Anda perlu memastikan file-file ini ada di dalam container Docker Anda
// Misalnya, melalui volume mount di docker-compose.yml
const privateKeyPath = process.env.SSL_KEY_PATH || '/app/certs/privkey.pem';
const certificatePath = process.env.SSL_CERT_PATH || '/app/certs/fullchain.pem';

let server;
const PORT = process.env.PORT || 443; // Port 443 untuk HTTPS standar

try {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const certificate = fs.readFileSync(certificatePath, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    server = https.createServer(credentials, app);
    console.log(`HTTPS server configured. Listening on port ${PORT}`);
} catch (e) {
    console.warn('SSL certificates not found or invalid. Falling back to HTTP on port 80.');
    console.error('SSL Error:', e.message);
    // Jika SSL gagal, bisa fallback ke HTTP di port 80 (jika diinginkan)
    server = http.createServer(app);
    const HTTP_PORT = process.env.HTTP_PORT || 80;
    server.listen(HTTP_PORT, () => {
         console.log(`HTTP server configured. Listening on port ${HTTP_PORT}`);
    });
    return; // Hentikan eksekusi lebih lanjut jika ingin hanya HTTP
}

const wss = new WebSocket.Server({ server });

server.listen(PORT, () => {
    console.log(`Server running on <span class="math-inline">\{server\.isSecure ? 'HTTPS' \: 'HTTP'\}\://0\.0\.0\.0\:</span>{PORT}`);
});

// ... (logic WebSocket signaling Anda yang sudah ada) ...
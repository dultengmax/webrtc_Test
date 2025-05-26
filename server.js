// server.js

const WebSocket = require('ws');
const http = require('http'); // Digunakan untuk membuat server HTTP dasar untuk WebSocket
const express = require('express'); // Express digunakan untuk membuat aplikasi HTTP dasar

const app = express();
// Membuat server HTTP dasar yang akan digunakan oleh WebSocket.
// Ini diperlukan agar WebSocket dapat berjalan di atas protokol HTTP.
const server = http.createServer(app);

// Membuat instance WebSocket Server di atas server HTTP yang sudah ada.
const wss = new WebSocket.Server({ server });

// Menentukan port untuk server signaling.
// Menggunakan process.env.PORT memungkinkan Coolify untuk mengkonfigurasi port.
// Default ke 8080 jika variabel lingkungan tidak disetel.
const PORT = process.env.PORT || 8080;

// Server mulai mendengarkan koneksi masuk di port yang ditentukan.
server.listen(PORT, () => {
    console.log(`Server signaling mendengarkan di http://0.0.0.0:${PORT}`);
});

// Event handler ketika klien baru terhubung ke server WebSocket.
wss.on('connection', ws => {
    console.log('Klien terhubung. Total klien:', wss.clients.size);

    // Event handler ketika menerima pesan dari klien.
    ws.on('message', message => {
        let parsedMessage;
        try {
            // Mencoba mem-parse pesan sebagai JSON.
            parsedMessage = JSON.parse(message);
        } catch (e) {
            // Log error jika pesan bukan JSON yang valid.
            console.error('Gagal mem-parse pesan:', message.toString(), e);
            return; // Hentikan pemrosesan pesan yang tidak valid.
        }

        // Meneruskan pesan ke semua klien lain yang terhubung.
        // Ini adalah mekanisme signaling sederhana untuk WebRTC.
        wss.clients.forEach(client => {
            // Pastikan klien bukan pengirim pesan dan koneksinya terbuka.
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage)); // Kirim pesan sebagai string JSON.
            }
        });
    });

    // Event handler ketika klien terputus dari server WebSocket.
    ws.on('close', () => {
        console.log('Klien terputus. Total klien:', wss.clients.size);
    });

    // Event handler ketika terjadi error pada koneksi WebSocket.
    ws.on('error', error => {
        console.error('Error WebSocket pada koneksi:', error);
    });
});

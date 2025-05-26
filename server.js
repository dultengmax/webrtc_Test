// // const express = require('express');
// // const { createServer } = require('node:http');

// // const app = express();
// // const server = createServer(app);

// // app.get('/', (req, res) => {
// //   res.send('<h1>Hello worldssssdasd</h1>');
// // });

// // server.listen(3000, () => {
// //   console.log('server running at http://localhost:3000');
// // });

// // const express = require('express');
// // const { createServer } = require('node:http');
// // const { join } = require('node:path');
// // const { Server } = require('socket.io');

// // const app = express();
// // const server = createServer(app);
// // const io = new Server(server);

// // app.get('/', (req, res) => {
// //   res.sendFile(join(__dirname, 'index.html'));
// // });

// // io.on('connection', (socket) => {
// //   console.log('a user connected');
// //     socket.on('chat message', (msg) => {
// //     io.emit('chat message', msg);
// //   });
// // });

// // server.listen(3000, () => {
// //   console.log('server running at http://localhost:3000');
// // });


// // server.js
// // const WebSocket = require('ws');
// // const http = require('http');
// // const path = require('path');
// // const fs = require('fs');

// // const PORT = 8080;

// // // Objek untuk melacak ruangan dan peer di dalamnya
// // // Untuk contoh sederhana ini, kita hanya mendukung 2 peer per ruangan
// // const rooms = {}; // { 'roomName': { 'peer1Id': ws1, 'peer2Id': ws2 } }

// // // Buat server HTTP dasar untuk menyajikan file HTML
// // const server = http.createServer((req, res) => {
// //     if (req.url === '/') {
// //         fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
// //             if (err) {
// //                 res.writeHead(500, { 'Content-Type': 'text/plain' });
// //                 res.end('Internal Server Error');
// //             } else {
// //                 res.writeHead(200, { 'Content-Type': 'text/html' });
// //                 res.end(data);
// //             }
// //         });
// //     } else {
// //         res.writeHead(404, { 'Content-Type': 'text/plain' });
// //         res.end('Not Found');
// //     }
// // });

// // // Buat server WebSocket di atas server HTTP
// // const wss = new WebSocket.Server({ server });

// // wss.on('connection', ws => {
// //     console.log('Client connected');
// //     let currentRoom = null; // Lacak ruangan klien ini

// //     ws.on('message', message => {
// //         const data = JSON.parse(message); // Asumsi pesan dalam format JSON

// //         switch (data.type) {
// //             case 'join':
// //                 const roomName = data.room;
// //                 currentRoom = roomName;

// //                 if (!rooms[roomName]) {
// //                     rooms[roomName] = {};
// //                 }

// //                 const clientsInRoom = Object.keys(rooms[roomName]).length;

// //                 if (clientsInRoom === 0) {
// //                     rooms[roomName][ws.id] = ws; // Simpan koneksi WebSocket dengan ID unik
// //                     ws.send(JSON.stringify({ type: 'created', room: roomName }));
// //                     console.log(`Room ${roomName} created by ${ws.id}`);
// //                 } else if (clientsInRoom === 1) {
// //                     // Cari peer yang sudah ada di ruangan
// //                     const existingPeerId = Object.keys(rooms[roomName])[0];
// //                     const existingPeerWs = rooms[roomName][existingPeerId];

// //                     rooms[roomName][ws.id] = ws; // Tambahkan peer baru
// //                     ws.send(JSON.stringify({ type: 'joined', room: roomName })); // Beritahu peer baru
// //                     existingPeerWs.send(JSON.stringify({ type: 'ready' })); // Beritahu peer yang sudah ada
// //                     console.log(`User ${ws.id} joined room ${roomName}`);
// //                 } else {
// //                     ws.send(JSON.stringify({ type: 'full', room: roomName }));
// //                     console.log(`Room ${roomName} is full, ${ws.id} cannot join.`);
// //                 }
// //                 break;

// //             case 'offer':
// //             case 'answer':
// //             case 'candidate':
// //                 // Teruskan pesan sinyaling ke peer lain di ruangan yang sama
// //                 if (currentRoom && rooms[currentRoom]) {
// //                     for (const clientId in rooms[currentRoom]) {
// //                         if (rooms[currentRoom][clientId] !== ws) {
// //                             rooms[currentRoom][clientId].send(message); // Kirim pesan asli (string JSON)
// //                         }
// //                     }
// //                 }
// //                 break;

// //             default:
// //                 console.warn('Unknown message type:', data.type);
// //         }
// //     });

// //     ws.on('close', () => {
// //         console.log('Client disconnected');
// //         // Hapus klien dari ruangan saat terputus
// //         if (currentRoom && rooms[currentRoom]) {
// //             delete rooms[currentRoom][ws.id];
// //             if (Object.keys(rooms[currentRoom]).length === 0) {
// //                 delete rooms[currentRoom]; // Hapus ruangan jika kosong
// //                 console.log(`Room ${currentRoom} is now empty and deleted.`);
// //             } else {
// //                 // Beritahu peer yang tersisa bahwa peer lain terputus
// //                 for (const clientId in rooms[currentRoom]) {
// //                     rooms[currentRoom][clientId].send(JSON.stringify({ type: 'peer_disconnected' }));
// //                 }
// //             }
// //         }
// //     });

// //     ws.on('error', error => {
// //         console.error('WebSocket error:', error);
// //     });

// //     // Beri ID unik ke setiap koneksi WebSocket
// //     // Ini bukan praktik terbaik untuk ID, tapi cukup untuk contoh sederhana
// //     ws.id = Math.random().toString(36).substring(2, 9);
// // });

// // server.listen(PORT, () => {
// //     console.log(`HTTP and WebSocket server running on http://localhost:${PORT}`);
// // });

// // server.js
// const WebSocket = require('ws');
// const http = require('http');
// const path = require('path');
// const fs = require('fs');

// const PORT = 8080;

// // Objek untuk melacak ruangan dan peer di dalamnya
// // Untuk contoh sederhana ini, kita hanya mendukung 2 peer per ruangan
// const rooms = {}; // { 'roomName': { 'peer1Id': ws1, 'peer2Id': ws2 } }

// // Buat server HTTP dasar untuk menyajikan file HTML
// const server = http.createServer((req, res) => {
//     if (req.url === '/') {
//         fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
//             if (err) {
//                 res.writeHead(500, { 'Content-Type': 'text/plain' });
//                 res.end('Internal Server Error');
//             } else {
//                 res.writeHead(200, { 'Content-Type': 'text/html' });
//                 res.end(data);
//             }
//         });
//     } else {
//         res.writeHead(404, { 'Content-Type': 'text/plain' });
//         res.end('Not Found');
//     }
// });

// // Buat server WebSocket di atas server HTTP
// const wss = new WebSocket.Server({ server });

// wss.on('connection', ws => {
//     console.log('Client connected');
//     let currentRoom = null; // Lacak ruangan klien ini

//     ws.on('message', message => {
//         const data = JSON.parse(message); // Asumsi pesan dalam format JSON

//         switch (data.type) {
//             case 'join':
//                 const roomName = data.room;
//                 currentRoom = roomName;

//                 if (!rooms[roomName]) {
//                     rooms[roomName] = {};
//                 }

//                 const clientsInRoom = Object.keys(rooms[roomName]).length;

//                 if (clientsInRoom === 0) {
//                     rooms[roomName][ws.id] = ws; // Simpan koneksi WebSocket dengan ID unik
//                     ws.send(JSON.stringify({ type: 'created', room: roomName }));
//                     console.log(`Room ${roomName} created by ${ws.id}`);
//                 } else if (clientsInRoom === 1) {
//                     // Cari peer yang sudah ada di ruangan
//                     const existingPeerId = Object.keys(rooms[roomName])[0];
//                     const existingPeerWs = rooms[roomName][existingPeerId];

//                     rooms[roomName][ws.id] = ws; // Tambahkan peer baru
//                     ws.send(JSON.stringify({ type: 'joined', room: roomName })); // Beritahu peer baru
//                     existingPeerWs.send(JSON.stringify({ type: 'ready' })); // Beritahu peer yang sudah ada
//                     console.log(`User ${ws.id} joined room ${roomName}`);
//                 } else {
//                     ws.send(JSON.stringify({ type: 'full', room: roomName }));
//                     console.log(`Room ${roomName} is full, ${ws.id} cannot join.`);
//                 }
//                 break;

//             case 'offer':
//             case 'answer':
//             case 'candidate':
//                 // Teruskan pesan sinyaling ke peer lain di ruangan yang sama
//                 if (currentRoom && rooms[currentRoom]) {
//                     for (const clientId in rooms[currentRoom]) {
//                         if (rooms[currentRoom][clientId] !== ws) {
//                             rooms[currentRoom][clientId].send(message); // Kirim pesan asli (string JSON)
//                         }
//                     }
//                 }
//                 break;

//             default:
//                 console.warn('Unknown message type:', data.type);
//         }
//     });

//     ws.on('close', () => {
//         console.log('Client disconnected');
//         // Hapus klien dari ruangan saat terputus
//         if (currentRoom && rooms[currentRoom]) {
//             delete rooms[currentRoom][ws.id];
//             if (Object.keys(rooms[currentRoom]).length === 0) {
//                 delete rooms[currentRoom]; // Hapus ruangan jika kosong
//                 console.log(`Room ${currentRoom} is now empty and deleted.`);
//             } else {
//                 // Beritahu peer yang tersisa bahwa peer lain terputus
//                 for (const clientId in rooms[currentRoom]) {
//                     rooms[currentRoom][clientId].send(JSON.stringify({ type: 'peer_disconnected' }));
//                 }
//             }
//         }
//     });

//     ws.on('error', error => {
//         console.error('WebSocket error:', error);
//     });

//     // Beri ID unik ke setiap koneksi WebSocket
//     // Ini bukan praktik terbaik untuk ID, tapi cukup untuk contoh sederhana
//     ws.id = Math.random().toString(36).substring(2, 9);
// });

// server.listen(PORT, () => {
//     console.log(`HTTP and WebSocket server running on http://localhost:${PORT}`);
// });


// server.js

const WebSocket = require('ws');
const http = require('http'); // Node.js http server untuk WebSocket
const express = require('express'); // Express untuk rute kosong, diperlukan jika tidak ada https

const app = express();
const server = http.createServer(app); // Server HTTP dasar yang akan digunakan oleh WebSocket

const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080; // Port default 8080

server.listen(PORT, () => {
    console.log(`Signaling server listening on http://0.0.0.0:${PORT}`);
});

wss.on('connection', ws => {
    console.log('Client connected. Total clients:', wss.clients.size);

    ws.on('message', message => {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
        } catch (e) {
            console.error('Failed to parse message:', message.toString(), e);
            return;
        }

        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage));
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected. Total clients:', wss.clients.size);
    });

    ws.on('error', error => {
        console.error('WebSocket error on connection:', error);
    });
});
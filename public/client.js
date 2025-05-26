const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');
const remoteAudio = document.getElementById('remoteAudio');

// public/client.js

// Tentukan protokol WebSocket berdasarkan protokol halaman
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// URL WebSocket langsung ke host dan port server Node.js
// Diasumsikan server Node.js akan berjalan di port standar (80 atau 443)
// Jika Anda menjalankan di port lain, tambahkan ":port"
signalingSocket = new WebSocket(wsProtocol + '//' + window.location.host);

let localStream;        // Stream dari mikrofon lokal
let peerConnection;     // RTCPeerConnection object
let signalingSocket;    // WebSocket untuk signaling

// Konfigurasi ICE servers, STUN servers sangat direkomendasikan
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Anda bisa menambahkan STUN server lain atau TURN server di sini jika perlu
    ]
};

async function startStreaming() {
    startButton.disabled = true;
    stopButton.disabled = false;
    statusDiv.textContent = 'Status: Initializing...';
    console.log('--- Starting WebRTC Stream ---');

    try {
        // 1. Dapatkan akses ke mikrofon lokal
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('Microphone accessed successfully.');
        statusDiv.textContent = 'Status: Microphone accessed.';

        // 2. Inisialisasi WebSocket untuk signaling
        signalingSocket = new WebSocket('ws://localhost:8080');

        signalingSocket.onopen = () => {
            console.log('Connected to signaling server.');
            statusDiv.textContent = 'Status: Connected to signaling server.';
            // Setelah terhubung ke signaling server, kita bisa membuat PeerConnection
            createPeerConnection();
            // Tambahkan track audio dari stream lokal ke peer connection
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
                console.log('Added local audio track to peer connection.');
            });

            // Kirim offer secara otomatis setelah terhubung ke signaling server
            // Ini akan membuat peer pertama sebagai "offerer"
            createOfferAndSend();
        };

        signalingSocket.onmessage = async event => {
            const message = JSON.parse(event.data);
            console.log('Received signaling message type:', message.type);

            if (!peerConnection) {
                // Jika peerConnection belum dibuat, buat sekarang (ini akan terjadi pada "answerer")
                createPeerConnection();
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                    console.log('Added local audio track to peer connection (answerer side).');
                });
            }

            try {
                if (message.type === 'offer') {
                    // Menerima offer dari peer lain, set remote description dan kirim answer
                    console.log('Received offer, setting remote description...');
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                    console.log('Creating answer...');
                    const answer = await peerConnection.createAnswer();
                    console.log('Setting local description (answer)...');
                    await peerConnection.setLocalDescription(answer);
                    console.log('Sending answer to signaling server.');
                    signalingSocket.send(JSON.stringify(answer));
                    statusDiv.textContent = 'Status: Received offer, sent answer.';
                } else if (message.type === 'answer') {
                    // Menerima answer dari peer lain, set remote description
                    console.log('Received answer, setting remote description...');
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                    statusDiv.textContent = 'Status: Received answer.';
                } else if (message.type === 'candidate') {
                    // Menerima ICE candidate
                    console.log('Received ICE candidate, adding...');
                    if (message.candidate) { // Pastikan candidate ada
                        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                        statusDiv.textContent = 'Status: Added ICE candidate.';
                    }
                }
            } catch (e) {
                console.error('Error handling signaling message:', message.type, e);
            }
        };

        signalingSocket.onclose = () => {
            console.log('Disconnected from signaling server.');
            statusDiv.textContent = 'Status: Disconnected from signaling server.';
            stopStreaming(); // Bersihkan jika signaling terputus
        };

        signalingSocket.onerror = error => {
            console.error('Signaling socket error:', error);
            statusDiv.textContent = 'Status: Signaling error.';
            stopStreaming(); // Bersihkan jika ada error signaling
        };

    } catch (error) {
        console.error('Error starting streaming:', error);
        statusDiv.textContent = `Status: Error - ${error.message}`;
        stopStreaming(); // Clean up on error
    }
}

// Fungsi terpisah untuk membuat dan mengirim offer
async function createOfferAndSend() {
    try {
        console.log('Creating offer...');
        const offer = await peerConnection.createOffer();
        console.log('Setting local description (offer)...');
        await peerConnection.setLocalDescription(offer);
        console.log('Sending offer to signaling server.');
        signalingSocket.send(JSON.stringify(offer));
        statusDiv.textContent = 'Status: Sent offer.';
    } catch (e) {
        console.error('Error creating or sending offer:', e);
    }
}

function createPeerConnection() {
    if (peerConnection) {
        console.log('PeerConnection already exists, skipping creation.');
        return;
    }

    peerConnection = new RTCPeerConnection(configuration);
    console.log('RTCPeerConnection created.');

    // Ketika ICE candidate tersedia, kirim ke peer lain melalui signaling server
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('Found ICE candidate, sending to signaling server.');
            signalingSocket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    // Ketika track (audio/video) diterima dari peer lain, tambahkan ke elemen audio
    peerConnection.ontrack = event => {
        console.log('Received remote track. Stream:', event.streams[0]);
        if (event.streams && event.streams[0]) {
            remoteAudio.srcObject = event.streams[0];
            statusDiv.textContent = 'Status: Receiving remote audio.';
            remoteAudio.play().catch(e => console.error('Error playing remote audio:', e));
        } else {
            console.warn('No streams found in ontrack event.');
        }
    };

    // Monitor status koneksi peer
    peerConnection.onconnectionstatechange = () => {
        console.log('Peer connection state changed:', peerConnection.connectionState);
        statusDiv.textContent = `Status: Peer connection ${peerConnection.connectionState}`;
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
            console.warn('Peer connection failed or disconnected.');
            // Mungkin perlu logika re-koneksi di sini
        } else if (peerConnection.connectionState === 'connected') {
            console.log('Peer connection established!');
        }
    };

    // Monitor status ICE connection
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state changed:', peerConnection.iceConnectionState);
        statusDiv.textContent = `Status: ICE connection ${peerConnection.iceConnectionState}`;
    };

    // Event onnegotiationneeded dipicu ketika perlu ada pertukaran SDP baru
    // Ini biasanya dipicu saat addTrack() atau removeTrack() dipanggil
    peerConnection.onnegotiationneeded = async () => {
        console.log('onnegotiationneeded triggered. Creating offer...');
        // Tidak perlu langsung membuat offer di sini karena kita sudah punya logika di onopen signaling socket
        // Ini adalah fallback atau untuk skenario dinamis lainnya
    };
}


function stopStreaming() {
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = 'Status: Stopping streaming...';
    console.log('--- Stopping WebRTC Stream ---');

    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped local track.');
        });
        localStream = null;
    }

    if (peerConnection) {
        console.log('Closing PeerConnection...');
        peerConnection.close();
        peerConnection = null;
    }

    if (signalingSocket) {
        console.log('Closing Signaling Socket...');
        signalingSocket.close();
        signalingSocket = null;
    }

    remoteAudio.srcObject = null;
    remoteAudio.pause();
    statusDiv.textContent = 'Status: Idle.';
}

startButton.addEventListener('click', startStreaming);
stopButton.addEventListener('click', stopStreaming);
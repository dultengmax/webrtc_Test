// public/client.js

// Mendapatkan referensi ke elemen DOM
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');
const remoteAudio = document.getElementById('remoteAudio');

// Variabel global untuk stream lokal, koneksi peer, dan socket signaling
let localStream;        // Stream dari mikrofon lokal
let peerConnection;     // Objek RTCPeerConnection
let signalingSocket;    // WebSocket untuk signaling

// Konfigurasi ICE servers (STUN servers sangat direkomendasikan)
// Ini membantu perangkat menemukan alamat IP publik mereka untuk koneksi peer-to-peer
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Anda bisa menambahkan STUN server lain atau TURN server di sini jika diperlukan
        // TURN server diperlukan jika STUN tidak cukup untuk menembus firewall yang ketat
    ]
};

/**
 * Memulai proses streaming audio WebRTC.
 * Melibatkan akses mikrofon, koneksi ke server signaling, dan inisiasi RTCPeerConnection.
 */
async function startStreaming() {
    // Nonaktifkan tombol 'Mulai Streaming' dan aktifkan 'Hentikan Streaming'
    startButton.disabled = true;
    stopButton.disabled = false;
    statusDiv.textContent = 'Status: Menginisialisasi...';
    console.log('--- Memulai Streaming WebRTC ---');

    try {
        // 1. Dapatkan akses ke mikrofon lokal pengguna
        // { audio: true, video: false } berarti hanya meminta akses audio
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('Mikrofon berhasil diakses.');
        statusDiv.textContent = 'Status: Mikrofon diakses.';

        // 2. Inisialisasi WebSocket untuk signaling
        // Coolify akan menangani SSL (HTTPS/WSS) dan meneruskan ke Nginx.
        // Nginx akan meneruskan ke backend Node.js melalui '/ws/' path.
        // Ini memastikan koneksi aman (WSS) jika halaman diakses via HTTPS.
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        signalingSocket = new WebSocket(wsProtocol + '//' + window.location.host + '/ws/');

        // Event handler ketika koneksi WebSocket terbuka
        signalingSocket.onopen = () => {
            console.log('Terhubung ke server signaling.');
            statusDiv.textContent = 'Status: Terhubung ke server signaling.';
            
            // Buat RTCPeerConnection setelah koneksi signaling siap
            createPeerConnection();
            
            // Tambahkan track audio dari stream lokal ke peer connection
            // Ini akan membuat audio kita tersedia untuk dikirim ke peer lain
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
                console.log('Track audio lokal ditambahkan ke peer connection.');
            });

            // Peer pertama yang terhubung akan membuat offer untuk memulai koneksi
            createOfferAndSend();
        };

        // Event handler ketika menerima pesan dari server signaling
        signalingSocket.onmessage = async event => {
            const message = JSON.parse(event.data);
            console.log('Menerima pesan signaling, tipe:', message.type);

            // Jika peerConnection belum dibuat (ini akan terjadi pada 'answerer' atau peer kedua)
            if (!peerConnection) {
                createPeerConnection();
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                    console.log('Track audio lokal ditambahkan ke peer connection (sisi answerer).');
                });
            }

            try {
                if (message.type === 'offer') {
                    // Menerima 'offer' dari peer lain
                    console.log('Menerima offer, mengatur deskripsi remote...');
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                    console.log('Membuat answer...');
                    const answer = await peerConnection.createAnswer();
                    console.log('Mengatur deskripsi lokal (answer)...');
                    await peerConnection.setLocalDescription(answer);
                    console.log('Mengirim answer ke server signaling.');
                    signalingSocket.send(JSON.stringify(answer));
                    statusDiv.textContent = 'Status: Menerima offer, mengirim answer.';
                } else if (message.type === 'answer') {
                    // Menerima 'answer' dari peer lain
                    console.log('Menerima answer, mengatur deskripsi remote...');
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                    statusDiv.textContent = 'Status: Menerima answer.';
                } else if (message.type === 'candidate') {
                    // Menerima ICE candidate (informasi konektivitas jaringan)
                    console.log('Menerima ICE candidate, menambahkan...');
                    if (message.candidate) { // Pastikan candidate ada
                        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                        statusDiv.textContent = 'Status: ICE candidate ditambahkan.';
                    }
                }
            } catch (e) {
                console.error('Error saat menangani pesan signaling:', message.type, e);
            }
        };

        // Event handler ketika koneksi WebSocket tertutup
        signalingSocket.onclose = () => {
            console.log('Terputus dari server signaling.');
            statusDiv.textContent = 'Status: Terputus dari server signaling.';
            stopStreaming(); // Bersihkan jika signaling terputus
        };

        // Event handler ketika terjadi error pada koneksi WebSocket
        signalingSocket.onerror = error => {
            console.error('Error socket signaling:', error);
            statusDiv.textContent = 'Status: Error signaling.';
            stopStreaming(); // Bersihkan jika ada error signaling
        };

    } catch (error) {
        // Tangani error jika gagal mengakses mikrofon atau inisialisasi lainnya
        console.error('Error saat memulai streaming:', error);
        statusDiv.textContent = `Status: Error - ${error.message}`;
        stopStreaming(); // Bersihkan jika ada error
    }
}

/**
 * Membuat dan mengirimkan Session Description Protocol (SDP) 'offer' ke peer lain
 * melalui server signaling.
 */
async function createOfferAndSend() {
    try {
        console.log('Membuat offer...');
        const offer = await peerConnection.createOffer();
        console.log('Mengatur deskripsi lokal (offer)...');
        await peerConnection.setLocalDescription(offer);
        console.log('Mengirim offer ke server signaling.');
        signalingSocket.send(JSON.stringify(offer));
        statusDiv.textContent = 'Status: Offer terkirim.';
    } catch (e) {
        console.error('Error saat membuat atau mengirim offer:', e);
    }
}

/**
 * Menginisialisasi objek RTCPeerConnection dan mengatur event handler-nya.
 */
function createPeerConnection() {
    // Hindari membuat peerConnection berulang kali
    if (peerConnection) {
        console.log('PeerConnection sudah ada, melewati pembuatan.');
        return;
    }

    peerConnection = new RTCPeerConnection(configuration);
    console.log('RTCPeerConnection dibuat.');

    // Event handler ketika ICE candidate tersedia
    // Candidate ini perlu dikirim ke peer lain melalui server signaling
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('Menemukan ICE candidate, mengirim ke server signaling.');
            signalingSocket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    // Event handler ketika track (audio/video) diterima dari peer lain
    // Stream yang diterima akan diputar di elemen audio remote
    peerConnection.ontrack = event => {
        console.log('Menerima track remote. Stream:', event.streams[0]);
        if (event.streams && event.streams[0]) {
            remoteAudio.srcObject = event.streams[0];
            statusDiv.textContent = 'Status: Menerima audio remote.';
            // Mencoba memutar audio, menangani potensi error autoplay
            remoteAudio.play().catch(e => console.error('Error saat memutar audio remote:', e));
        } else {
            console.warn('Tidak ada stream ditemukan di event ontrack.');
        }
    };

    // Monitor perubahan status koneksi peer (misalnya 'connecting', 'connected', 'disconnected', 'failed')
    peerConnection.onconnectionstatechange = () => {
        console.log('Status koneksi peer berubah:', peerConnection.connectionState);
        statusDiv.textContent = `Status: Koneksi peer ${peerConnection.connectionState}`;
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
            console.warn('Koneksi peer gagal atau terputus.');
            // Di sini Anda bisa mengimplementasikan logika re-koneksi jika diperlukan
        } else if (peerConnection.connectionState === 'connected') {
            console.log('Koneksi peer berhasil terjalin!');
        }
    };

    // Monitor perubahan status koneksi ICE (misalnya 'new', 'checking', 'connected', 'completed')
    peerConnection.oniceconnectionstatechange = () => {
        console.log('Status koneksi ICE berubah:', peerConnection.iceConnectionState);
        statusDiv.textContent = `Status: Koneksi ICE ${peerConnection.iceConnectionState}`;
    };

    // Event onnegotiationneeded dipicu ketika perlu ada pertukaran SDP baru
    // Ini biasanya dipicu saat addTrack() atau removeTrack() dipanggil
    peerConnection.onnegotiationneeded = async () => {
        console.log('onnegotiationneeded terpicu.');
        // Dalam setup sederhana ini, kita sudah menangani offer/answer di onopen/onmessage
        // Jadi, ini mungkin tidak perlu membuat offer di sini kecuali untuk skenario dinamis lainnya
    };
}

/**
 * Menghentikan semua streaming dan membersihkan sumber daya WebRTC.
 */
function stopStreaming() {
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = 'Status: Menghentikan streaming...';
    console.log('--- Menghentikan Streaming WebRTC ---');

    // Hentikan semua track dari stream lokal
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            console.log('Track lokal dihentikan.');
        });
        localStream = null;
    }

    // Tutup RTCPeerConnection
    if (peerConnection) {
        console.log('Menutup PeerConnection...');
        peerConnection.close();
        peerConnection = null;
    }

    // Tutup WebSocket signaling
    if (signalingSocket) {
        console.log('Menutup Socket Signaling...');
        signalingSocket.close();
        signalingSocket = null;
    }

    // Hentikan pemutaran audio remote dan reset sumbernya
    remoteAudio.srcObject = null;
    remoteAudio.pause();
    statusDiv.textContent = 'Status: Idle.';
}

// Menambahkan event listener ke tombol
startButton.addEventListener('click', startStreaming);
stopButton.addEventListener('click', stopStreaming);

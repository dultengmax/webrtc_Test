// public/client.js

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');
const remoteAudio = document.getElementById('remoteAudio');

let localStream;        // Stream dari mikrofon lokal
let peerConnection;     // RTCPeerConnection object
let signalingSocket;    // WebSocket untuk signaling

// Konfigurasi ICE servers, STUN servers sangat direkomendasikan
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
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
        // Coolify akan menangani SSL (HTTPS/WSS) dan meneruskan ke Nginx
        // Nginx akan meneruskan ke backend Node.js melalui /ws/ path
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        signalingSocket = new WebSocket(wsProtocol + '//' + window.location.host + '/ws/');

        signalingSocket.onopen = () => {
            console.log('Connected to signaling server.');
            statusDiv.textContent = 'Status: Connected to signaling server.';
            createPeerConnection(); // Buat PeerConnection setelah signaling siap
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
                console.log('Added local audio track to peer connection.');
            });
            createOfferAndSend(); // Peer pertama membuat offer
        };

        signalingSocket.onmessage = async event => {
            const message = JSON.parse(event.data);
            console.log('Received signaling message type:', message.type);

            if (!peerConnection) {
                // Buat peerConnection jika belum ada (ini untuk peer kedua/answerer)
                createPeerConnection();
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                    console.log('Added local audio track to peer connection (answerer side).');
                });
            }

            try {
                if (message.type === 'offer') {
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
                    console.log('Received answer, setting remote description...');
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                    statusDiv.textContent = 'Status: Received answer.';
                } else if (message.type === 'candidate') {
                    console.log('Received ICE candidate, adding...');
                    if (message.candidate) {
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
            stopStreaming();
        };

        signalingSocket.onerror = error => {
            console.error('Signaling socket error:', error);
            statusDiv.textContent = 'Status: Signaling error.';
            stopStreaming();
        };

    } catch (error) {
        console.error('Error starting streaming:', error);
        statusDiv.textContent = `Status: Error - ${error.message}`;
        stopStreaming();
    }
}

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

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('Found ICE candidate, sending to signaling server.');
            signalingSocket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

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

    peerConnection.onconnectionstatechange = () => {
        console.log('Peer connection state changed:', peerConnection.connectionState);
        statusDiv.textContent = `Status: Peer connection ${peerConnection.connectionState}`;
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
            console.warn('Peer connection failed or disconnected.');
        } else if (peerConnection.connectionState === 'connected') {
            console.log('Peer connection established!');
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state changed:', peerConnection.iceConnectionState);
        statusDiv.textContent = `Status: ICE connection ${peerConnection.iceConnectionState}`;
    };

    peerConnection.onnegotiationneeded = async () => {
        console.log('onnegotiationneeded triggered.');
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
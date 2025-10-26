// Chat room functionality with WebSocket, encryption, signatures, and WebRTC

let socket;
let session;
let messages = [];
let users = [];
let peerConnections = {};
let passphraseChanging = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const sessionData = sessionStorage.getItem('chat-session');
    if (!sessionData) {
        window.location.href = '/';
        return;
    }
    
    session = JSON.parse(sessionData);
    
    // Display room info
    document.getElementById('room-name').textContent = session.roomName;
    document.getElementById('room-id-display').value = session.roomId;
    document.getElementById('passphrase-display').value = session.passphrase;
    
    if (session.storageMode === 'persistent') {
        document.getElementById('storage-mode-badge').textContent = 'PERSISTENT';
    }
    
    // Show admin controls
    if (!session.isAdmin) {
        document.getElementById('admin-controls').style.display = 'none';
    }
    
    // Generate and display fingerprint
    const fingerprint = await cryptoManager.generateFingerprint(session.publicKey);
    document.getElementById('my-fingerprint').textContent = fingerprint;
    
    // Connect to WebSocket
    connectWebSocket();
});

function connectWebSocket() {
    socket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
        console.log('[WS] Connected');
        updateConnectionStatus(true);
        
        // Join room
        socket.emit('join_room', {
            roomId: session.roomId,
            username: session.username,
            passphrase: session.passphrase,
            userId: session.userId,
            isAdmin: session.isAdmin,
            publicKey: session.publicKey
        });
    });
    
    socket.on('disconnect', () => {
        console.log('[WS] Disconnected');
        updateConnectionStatus(false);
    });
    
    socket.on('message_broadcast', async (msg) => {
        if (passphraseChanging) return;
        
        const decrypted = await cryptoManager.decryptMessage(msg.content, session.passphrase);
        
        // Verify signature if present
        let verified = false;
        if (msg.signature && msg.publicKey) {
            verified = await cryptoManager.verifySignature(msg.content, msg.signature, msg.publicKey);
        }
        
        const message = {
            ...msg,
            content: decrypted,
            verified
        };
        
        messages.push(message);
        displayMessage(message);
        
        // Handle self-destruct
        if (msg.ttl && msg.ttl > 0) {
            setTimeout(() => {
                removeMessage(msg.id);
            }, msg.ttl * 1000);
        }
    });
    
    socket.on('user_joined', (data) => {
        if (passphraseChanging) return;
        addSystemMessage(`→ ${data.username} joined the room`);
    });
    
    socket.on('user_left', (data) => {
        if (passphraseChanging) return;
        addSystemMessage(`← ${data.username} left the room`);
    });
    
    socket.on('user_list_update', (data) => {
        users = data.users;
        updateUsersList();
    });
    
    socket.on('clear_history', () => {
        messages = [];
        document.getElementById('messages').innerHTML = '<div style="text-align: center; color: var(--text-tertiary); font-size: 0.85rem;">No messages yet. Start the conversation!</div>';
        passphraseChanging = false;
    });
    
    socket.on('passphrase_changed', () => {
        showToast('Room passphrase changed by admin. Disconnecting...', 'error');
        sessionStorage.removeItem('chat-session');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    });
    
    socket.on('message_deleted', (data) => {
        removeMessage(data.messageId);
    });
    
    socket.on('file_shared', async (file) => {
        displayFileShare(file);
    });
    
    socket.on('webrtc_signal', async (data) => {
        handleWebRTCSignal(data);
    });
    
    socket.on('error', (data) => {
        showToast(data.message, 'error');
        if (data.fatal) {
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content) return;
    
    const encrypted = await cryptoManager.encryptMessage(content, session.passphrase);
    const signature = await cryptoManager.signMessage(encrypted);
    const ttl = parseInt(document.getElementById('ttl-select').value);
    
    const messageData = {
        id: Date.now().toString(),
        roomId: session.roomId,
        userId: session.userId,
        username: session.username,
        content: encrypted,
        ttl: ttl > 0 ? ttl : null,
        signature,
        publicKey: session.publicKey
    };
    
    socket.emit('send_message', messageData);
    input.value = '';
}

function handleMessageKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function displayMessage(msg) {
    const container = document.getElementById('messages');
    
    // Remove placeholder
    if (container.children.length === 1 && container.children[0].textContent.includes('No messages')) {
        container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.userId === session.userId ? 'own' : ''}${msg.isSystem ? ' system' : ''}`;
    messageDiv.id = `msg-${msg.id}`;
    
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    const timeLeft = msg.ttl ? formatTimeLeft(msg.ttl) : '';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span style="color: var(--text-secondary);">${msg.username} · ${timestamp}</span>
            <span style="display: flex; gap: 0.25rem; align-items: center;">
                ${msg.verified ? '<span class="verified-badge">✓ VERIFIED</span>' : ''}
                ${msg.ttl ? `<span class="timer-badge" id="timer-${msg.id}">🔥 ${timeLeft}</span>` : ''}
            </span>
        </div>
        <div class="message-content">${escapeHtml(msg.content)}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    // Update timer
    if (msg.ttl) {
        startMessageTimer(msg.id, msg.ttl);
    }
}

function startMessageTimer(messageId, ttl) {
    const endTime = Date.now() + (ttl * 1000);
    
    const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        const timerEl = document.getElementById(`timer-${messageId}`);
        
        if (timerEl) {
            timerEl.textContent = `🔥 ${formatTimeLeft(remaining)}`;
        }
        
        if (remaining === 0) {
            clearInterval(interval);
        }
    }, 1000);
}

function formatTimeLeft(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function removeMessage(messageId) {
    const msgEl = document.getElementById(`msg-${messageId}`);
    if (msgEl) {
        msgEl.style.opacity = '0.5';
        msgEl.style.transform = 'scale(0.9)';
        msgEl.style.transition = 'all 0.3s';
        setTimeout(() => {
            msgEl.remove();
            messages = messages.filter(m => m.id !== messageId);
        }, 300);
    }
}

function addSystemMessage(content) {
    const msg = {
        id: `system_${Date.now()}`,
        userId: 'system',
        username: 'System',
        content,
        timestamp: Date.now(),
        isSystem: true
    };
    messages.push(msg);
    displayMessage(msg);
}

function updateUsersList() {
    const container = document.getElementById('users-list');
    const webrtcContainer = document.getElementById('webrtc-users');
    
    document.getElementById('user-count').textContent = users.length;
    
    container.innerHTML = users.map(user => {
        const isMe = user.id === session.userId;
        const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];
        const colorIndex = user.username.charCodeAt(0) % colors.length;
        const bgColor = colors[colorIndex];
        
        return `
            <div class="user-item">
                <div class="user-avatar" style="background: ${bgColor}">
                    ${user.username.substring(0, 2).toUpperCase()}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(user.username)} ${isMe ? '(YOU)' : ''}
                    </div>
                    ${user.is_admin ? '<div class="badge badge-success" style="font-size: 0.65rem; padding: 0.1rem 0.4rem;">👑 ADMIN</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // WebRTC users
    webrtcContainer.innerHTML = users.filter(u => u.id !== session.userId).map(user => `
        <button class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem; font-size: 0.75rem;" onclick="initiateP2P('${user.id}')">
            📞 ${escapeHtml(user.username)}
        </button>
    `).join('');
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('File too large. Max 10MB', 'error');
        return;
    }
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const encrypted = await cryptoManager.encryptFile(arrayBuffer, session.passphrase);
        const signature = await cryptoManager.signMessage(encrypted);
        
        socket.emit('share_file', {
            roomId: session.roomId,
            userId: session.userId,
            username: session.username,
            filename: file.name,
            encryptedData: encrypted,
            mimeType: file.type,
            fileSize: file.size,
            signature
        });
        
        showToast('File shared successfully', 'success');
    } catch (error) {
        showToast('Failed to share file', 'error');
    }
    
    event.target.value = '';
}

async function displayFileShare(file) {
    const container = document.getElementById('messages');
    
    if (container.children.length === 1 && container.children[0].textContent.includes('No messages')) {
        container.innerHTML = '';
    }
    
    const fileDiv = document.createElement('div');
    fileDiv.className = `message ${file.userId === session.userId ? 'own' : ''}`;
    
    const timestamp = new Date(file.timestamp).toLocaleTimeString();
    const fileIcon = getFileIcon(file.mimeType);
    
    fileDiv.innerHTML = `
        <div class="message-header">
            <span style="color: var(--text-secondary);">${file.username} · ${timestamp}</span>
        </div>
        <div class="file-preview">
            <div style="font-size: 2rem;">${fileIcon}</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(file.filename)}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${formatFileSize(file.fileSize)}</div>
            </div>
            <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.75rem;" onclick='downloadFile(${JSON.stringify(file)})'>
                ⬇️ Download
            </button>
        </div>
    `;
    
    container.appendChild(fileDiv);
    container.scrollTop = container.scrollHeight;
}

async function downloadFile(file) {
    try {
        const decrypted = await cryptoManager.decryptFile(file.encryptedData, session.passphrase);
        const blob = new Blob([decrypted], { type: file.mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        
        URL.revokeObjectURL(url);
        showToast('File downloaded', 'success');
    } catch (error) {
        showToast('Failed to download file', 'error');
    }
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📁';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// WebRTC P2P Functions
async function initiateP2P(targetUserId) {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });
    
    peerConnections[targetUserId] = pc;
    
    // Create data channel
    const dataChannel = pc.createDataChannel('chat');
    setupDataChannel(dataChannel, targetUserId);
    
    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    socket.emit('webrtc_signal', {
        targetUserId,
        senderId: session.userId,
        type: 'offer',
        data: offer
    });
    
    showToast(`P2P connection initiated with user`, 'success');
}

async function handleWebRTCSignal(data) {
    const { senderId, type, data: signalData } = data;
    
    if (type === 'offer') {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });
        
        peerConnections[senderId] = pc;
        
        pc.ondatachannel = (event) => {
            setupDataChannel(event.channel, senderId);
        };
        
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('webrtc_signal', {
            targetUserId: senderId,
            senderId: session.userId,
            type: 'answer',
            data: answer
        });
    } else if (type === 'answer') {
        const pc = peerConnections[senderId];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        }
    } else if (type === 'ice-candidate') {
        const pc = peerConnections[senderId];
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData));
        }
    }
}

function setupDataChannel(channel, peerId) {
    channel.onopen = () => {
        showToast('P2P connection established', 'success');
    };
    
    channel.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        const decrypted = await cryptoManager.decryptMessage(msg.content, session.passphrase);
        
        addSystemMessage(`[P2P] ${msg.username}: ${decrypted}`);
    };
}

// Passphrase Management
function showPassphraseModal() {
    document.getElementById('passphrase-modal').classList.add('active');
}

function closePassphraseModal() {
    document.getElementById('passphrase-modal').classList.remove('active');
    document.getElementById('new-passphrase').value = '';
    document.getElementById('confirm-passphrase').value = '';
}

async function changePassphrase() {
    const newPass = document.getElementById('new-passphrase').value;
    const confirmPass = document.getElementById('confirm-passphrase').value;
    
    if (newPass.length < 6) {
        showToast('Passphrase must be at least 6 characters', 'error');
        return;
    }
    
    if (newPass !== confirmPass) {
        showToast('Passphrases do not match', 'error');
        return;
    }
    
    passphraseChanging = true;
    
    socket.emit('change_passphrase', {
        roomId: session.roomId,
        userId: session.userId,
        newPassphrase: newPass
    });
    
    session.passphrase = newPass;
    sessionStorage.setItem('chat-session', JSON.stringify(session));
    document.getElementById('passphrase-display').value = newPass;
    
    closePassphraseModal();
    showToast('Passphrase changed. Message history cleared.', 'success');
}

// Utility Functions
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-indicator');
    const status = document.getElementById('connection-status');
    
    if (connected) {
        indicator.classList.remove('status-disconnected');
        indicator.classList.add('status-connected');
        status.textContent = 'CONNECTED';
        status.style.color = 'var(--accent-green)';
    } else {
        indicator.classList.remove('status-connected');
        indicator.classList.add('status-disconnected');
        status.textContent = 'DISCONNECTED';
        status.style.color = 'var(--accent-red)';
    }
}

function copyRoomId() {
    navigator.clipboard.writeText(session.roomId);
    showToast('Room ID copied to clipboard', 'success');
}

function copyPassphrase() {
    navigator.clipboard.writeText(session.passphrase);
    showToast('Passphrase copied to clipboard', 'success');
}

function leaveRoom() {
    socket.emit('leave_room', {
        roomId: session.roomId,
        userId: session.userId
    });
    sessionStorage.removeItem('chat-session');
    window.location.href = '/';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <strong>${type === 'error' ? '❌ Error' : '✅ Success'}</strong>
                <div style="margin-top: 0.5rem; font-size: 0.85rem;">${message}</div>
            </div>
        </div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

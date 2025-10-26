// Landing page functionality

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    });
});

// Toast notification
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

// Generate user ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Create room
document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const roomName = document.getElementById('create-room-name').value;
    const username = document.getElementById('create-username').value;
    const passphrase = document.getElementById('create-passphrase').value;
    const storageMode = document.getElementById('storage-mode').value;
    const userId = generateUserId();
    
    try {
        const response = await fetch('/api/rooms/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomName,
                passphrase,
                createdBy: userId,
                storageMode
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create room');
        }
        
        const data = await response.json();
        
        // Generate key pair for signatures
        await cryptoManager.generateKeyPair();
        const publicKey = await cryptoManager.exportPublicKey();
        
        // Store session data
        sessionStorage.setItem('chat-session', JSON.stringify({
            roomId: data.roomId,
            roomName: data.roomName,
            username,
            passphrase,
            userId,
            isAdmin: true,
            publicKey,
            storageMode
        }));
        
        window.location.href = '/chat';
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Join room
document.getElementById('join-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const roomId = document.getElementById('join-room-id').value;
    const username = document.getElementById('join-username').value;
    const passphrase = document.getElementById('join-passphrase').value;
    const userId = generateUserId();
    
    try {
        const response = await fetch('/api/rooms/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId,
                passphrase
            })
        });
        
        if (!response.ok) {
            throw new Error('Room not found');
        }
        
        const data = await response.json();
        
        if (!data.valid) {
            throw new Error('Invalid passphrase');
        }
        
        // Generate key pair for signatures
        await cryptoManager.generateKeyPair();
        const publicKey = await cryptoManager.exportPublicKey();
        
        // Store session data
        sessionStorage.setItem('chat-session', JSON.stringify({
            roomId,
            roomName: data.roomName,
            username,
            passphrase,
            userId,
            isAdmin: false,
            publicKey
        }));
        
        window.location.href = '/chat';
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Sample feedback data
const initialFeedback = [
    { name: "User1", text: "Amazing portfolio! Love the interactive elements." },
    { name: "User2", text: "Clean design and smooth animations. Great work!" },
    { name: "User3", text: "The puzzle game was really engaging!" },
];

const FEEDBACK_KEY = 'user_feedback';
let feedbackData = JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];

function initializeFeedback() {
    // Load existing feedback
    updateTracks();
    
    // Admin shortcut (Triple press D)
    let dPressCount = 0;
    let lastDPressTime = 0;
    
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'd') {
            const now = Date.now();
            if (now - lastDPressTime < 500) { // 500ms window
                dPressCount++;
            } else {
                dPressCount = 1;
            }
            lastDPressTime = now;

            if (dPressCount === 3) {
                document.querySelector('.admin-panel').classList.toggle('active');
                dPressCount = 0; // Reset counter after activation
                e.preventDefault();
            }
        }
    });
}

function updateTracks() {
    const tracks = document.querySelectorAll('.feedback-track');
    const track1Items = feedbackData.filter((_, index) => index % 2 === 0);
    const track2Items = feedbackData.filter((_, index) => index % 2 === 1);

    // Update Track 1 (even indices)
    tracks[0].innerHTML = '';
    track1Items.forEach(fb => {
        tracks[0].appendChild(createFeedbackCard(fb));
    });

    // Update Track 2 (odd indices)
    tracks[1].innerHTML = '';
    track2Items.forEach(fb => {
        tracks[1].appendChild(createFeedbackCard(fb));
    });
}

function createFeedbackCard(feedback) {
    const card = document.createElement('div');
    card.className = 'feedback-card';
    card.innerHTML = `
        <div class="user-header">
            <div class="user-icon" style="background: ${getGradientForName(feedback.name)}"></div>
            <h3>${feedback.name}</h3>
        </div>
        <p>"${feedback.text}"</p>
    `;
    return card;
}

function toggleFeedbackForm(immediate = false) {
    const overlay = document.getElementById('feedbackOverlay');
    const form = document.querySelector('.feedback-form');
    
    if (overlay.style.display === 'flex') {
        if (immediate) {
            overlay.style.display = 'none';
            form.style.transform = 'scale(0)';
        } else {
            overlay.style.display = 'none';
            form.style.transform = 'scale(0.8)';
        }
    } else {
        overlay.style.display = 'flex';
        form.style.transform = 'scale(1)';
    }
}

function submitFeedback() {
    const userName = document.getElementById('userName').value.trim();
    const userFeedback = document.getElementById('userFeedback').value.trim();
    
    if (!userName || !userFeedback) return;

    // Create feedback object with unique identifier
    const newFeedback = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
        name: userName,
        text: userFeedback,
        timestamp: Date.now(),
        deviceId: getOrCreateDeviceId()
    };

    // Check for duplicate submission
    if (isDuplicateFeedback(newFeedback)) {
        alert('You have already submitted similar feedback recently.');
        return;
    }

    // Save to both local storage and server
    saveFeedbackToServer(newFeedback).then(() => {
        feedbackData.push(newFeedback);
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackData));
        updateTracks();
        
        // Create fullscreen GIF overlay
        const submittedOverlay = document.createElement('div');
        submittedOverlay.className = 'submitted-overlay';
        submittedOverlay.innerHTML = '<img src="https://media.giphy.com/media/B98goRFG6MvtbkPran/giphy.gif?cid=790b761193aqrwfn85bcpmdmb3ywe3dfocpbuwtyoqz6aeue&ep=v1_gifs_search&rid=giphy.gif&ct=g" alt="Submitted" class="submitted-gif">';
        document.body.appendChild(submittedOverlay);
        
        // Clear form inputs
        document.getElementById('userName').value = '';
        document.getElementById('userFeedback').value = '';
        
        // Add click event to close overlay
        submittedOverlay.addEventListener('click', () => {
            submittedOverlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(submittedOverlay);
            }, 500);
        });
    });
}

// Helper function to get or create device ID
function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Check for duplicate feedback
function isDuplicateFeedback(newFeedback) {
    const recentFeedbacks = feedbackData.filter(fb => 
        fb.deviceId === newFeedback.deviceId && 
        Date.now() - fb.timestamp < 24 * 60 * 60 * 1000 // 24 hours
    );

    return recentFeedbacks.some(fb => 
        fb.text.toLowerCase().trim() === newFeedback.text.toLowerCase().trim()
    );
}

// Save feedback to server
async function saveFeedbackToServer(feedback) {
    try {
        const response = await fetch('https://api.jsonbin.io/v3/b/67cdc57bad19ca34f8193431', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': '$2a$10$.OYhnUr5Na28.aDasn9JRenMZA4.9KUfpM1GyA/T4DCg7lmqI.SjK',
                'X-Bin-Versioning': 'false',
                'X-Bin-Private': 'false',
                'X-Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(feedbackData.concat(feedback))
        });
        return response.ok;
    } catch (error) {
        console.error('Error saving feedback:', error);
        return false;
    }
}

// Load feedback from server
async function loadFeedbackFromServer() {
    try {
        const response = await fetch('https://api.jsonbin.io/v3/b/67cdc57bad19ca34f8193431/latest', {
            method: 'GET',
            headers: {
                'X-Master-Key': '$2a$10$.OYhnUr5Na28.aDasn9JRenMZA4.9KUfpM1GyA/T4DCg7lmqI.SjK',
                'X-Access-Control-Allow-Origin': '*'
            }
        });
        if (response.ok) {
            const data = await response.json();
            feedbackData = data.record || [];
            localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackData));
            updateTracks();
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
        // Fallback to local storage if server fails
        feedbackData = JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];
        updateTracks();
    }
}

// Initialize feedback with server data
document.addEventListener('DOMContentLoaded', () => {
    loadFeedbackFromServer();
    initializeFeedback();
});

// Admin Panel Functions
function deleteFeedback(timestamp) {
    // Remove the feedback from local data
    feedbackData = feedbackData.filter(fb => fb.timestamp !== timestamp);
    
    // Update local storage
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackData));
    
    // Update server with the new data
    fetch('https://api.jsonbin.io/v3/b/67cdc57bad19ca34f8193431', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': '$2a$10$.OYhnUr5Na28.aDasn9JRenMZA4.9KUfpM1GyA/T4DCg7lmqI.SjK',
            'X-Bin-Versioning': 'false',
            'X-Bin-Private': 'false',
            'X-Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(feedbackData)
    })
    .then(response => {
        if (response.ok) {
            console.log('Feedback successfully deleted from server');
            // Create a toast notification
            const toast = document.createElement('div');
            toast.className = 'feedback-toast';
            toast.textContent = 'Feedback deleted';
            document.body.appendChild(toast);
            
            // Remove toast after 3 seconds
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => document.body.removeChild(toast), 500);
            }, 3000);
        } else {
            console.error('Failed to delete feedback from server');
            alert('Failed to delete feedback from server. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error deleting feedback:', error);
        alert('An error occurred while deleting feedback. Please try again.');
    });
    
    // Update UI
    updateTracks();
    updateAdminPanel();
}

function updateAdminPanel() {
    const panel = document.querySelector('.admin-panel ul');
    panel.innerHTML = feedbackData.map(fb => `
        <li class="feedback-item">
            <div class="user-icon" style="background: ${getGradientForName(fb.name)}"></div>
            <div class="feedback-content">
                <strong>${fb.name}</strong>
                <p>${fb.text}</p>
                <small>${new Date(fb.timestamp).toLocaleDateString()}</small>
            </div>
            <button class="delete-btn" onclick="deleteFeedback(${fb.timestamp})">
                <i class="fas fa-trash"></i>
            </button>
        </li>
    `).join('');
}

// Add admin panel to DOM
const adminPanel = document.createElement('div');
adminPanel.className = 'admin-panel';
adminPanel.innerHTML = `
    <div class="admin-header">
        <h3>Feedback Management</h3>
        <button class="close-admin" onclick="this.parentElement.parentElement.classList.remove('active')">
            &times;
        </button>
    </div>
    <ul class="feedback-list"></ul>
    <button class="clear-all-btn" onclick="feedbackData = []; localStorage.removeItem('${FEEDBACK_KEY}'); updateTracks(); updateAdminPanel();">
        Clear All Feedback
    </button>
`;
document.body.appendChild(adminPanel);

// Initialize admin panel
updateAdminPanel();

function getGradientForName(name) {
    // Create consistent hash from name
    const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Predefined set of pleasant gradients
    const gradients = [
        'linear-gradient(135deg, #ff6b6b, #ff8e53)',
        'linear-gradient(135deg, #4ecdc4, #45b7d1)',
        'linear-gradient(135deg, #96f2d7, #63e6be)',
        'linear-gradient(135deg, #b197fc, #9775fa)',
        'linear-gradient(135deg, #ffd43b, #ffc078)',
        'linear-gradient(135deg, #d8b5ff, #1eae98)',
        'linear-gradient(135deg, #fccb90, #d57eeb)'
    ];
    
    return gradients[hash % gradients.length];
}

// Add CSS for toast notifications
const style = document.createElement('style');
style.textContent = `
.feedback-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #4CAF50;
    color: white;
    padding: 16px;
    border-radius: 4px;
    z-index: 1000;
    box-shadow: 0 3px 6px rgba(0,0,0,0.16);
    opacity: 1;
    transition: opacity 0.5s;
}
`;
document.head.appendChild(style); 
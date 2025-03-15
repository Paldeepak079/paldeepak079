// Custom cursor
const cursor = document.querySelector('.cursor');
let cursorScale = 1;
let isHovering = false;

function updateCursor(e) {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
}

function animateCursor() {
    if (isHovering) {
        cursorScale = Math.min(cursorScale + 0.2, 4);
    } else {
        cursorScale = Math.max(cursorScale - 0.2, 1);
    }
    cursor.style.transform = `translate(-50%, -50%) scale(${cursorScale})`;
    requestAnimationFrame(animateCursor);
}

document.addEventListener('mousemove', updateCursor);

// Text reveal animation
const firstStatementWords = document.querySelectorAll('.statement-one span');
const secondStatementWords = document.querySelectorAll('.statement-two span');

// Initialize
function initializeStatements() {
    // Reset positions before recalculating
    secondStatementWords.forEach(word => {
        word.style.opacity = '0';
        word.style.position = 'absolute';
    });

    // Delay calculation to ensure layout is complete
    requestAnimationFrame(() => {
        firstStatementWords.forEach((word, index) => {
            const rect = word.getBoundingClientRect();
            const parentRect = word.parentElement.getBoundingClientRect();
            
            if (secondStatementWords[index]) {
                secondStatementWords[index].style.left = `${rect.left - parentRect.left}px`;
                secondStatementWords[index].style.top = `${rect.top - parentRect.top}px`;
                secondStatementWords[index].style.width = `${rect.width}px`;
            }
        });
    });
}

// Add resize observer for more precise updates
const resizeObserver = new ResizeObserver(() => {
    initializeStatements();
});

// Observe the container
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.statement-container');
    if (container) {
        resizeObserver.observe(container);
    }
    initializeStatements();
});

// Cleanup
window.addEventListener('beforeunload', () => {
    resizeObserver.disconnect();
});

// Add hover events to each word
firstStatementWords.forEach((word, index) => {
    word.addEventListener('mouseenter', () => {
        isHovering = true;
        
        // Hide first statement word
        word.style.opacity = '0';
        word.style.transform = 'translateY(-10px)';
        
        // Show second statement word
        if (secondStatementWords[index]) {
            secondStatementWords[index].style.opacity = '1';
            secondStatementWords[index].style.transform = 'translateY(0)';
        }
    });

    word.addEventListener('mouseleave', () => {
        isHovering = false;
        
        // Show first statement word
        word.style.opacity = '1';
        word.style.transform = 'translateY(0)';
        
        // Hide second statement word
        if (secondStatementWords[index]) {
            secondStatementWords[index].style.opacity = '0';
            secondStatementWords[index].style.transform = 'translateY(10px)';
        }
    });
});

// Start cursor animation
animateCursor(); 
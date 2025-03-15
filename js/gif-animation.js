document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo img');
    const gifContainer = document.querySelector('.gif-container');
    const gifs = document.querySelectorAll('.gif-item');
    let currentGifIndex = -1;
    let isAnimating = false;

    function showGif(index) {
        if (isAnimating) return;
        isAnimating = true;

        // Hide current GIF if any
        if (currentGifIndex >= 0) {
            gifs[currentGifIndex].classList.remove('active');
        }

        // Show new GIF
        currentGifIndex = index;
        gifContainer.classList.add('active');
        gifs[currentGifIndex].classList.add('active');

        // Auto-hide after animation
        setTimeout(() => {
            gifContainer.classList.remove('active');
            gifs[currentGifIndex].classList.remove('active');
            isAnimating = false;
        }, 3000); // Adjust timing as needed
    }

    logo.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Move to next GIF or reset to first
        const nextIndex = (currentGifIndex + 1) % gifs.length;
        showGif(nextIndex);
    });
}); 
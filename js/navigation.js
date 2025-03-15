document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.vertical-nav a');
    const pages = ['about', 'projects', 'contact', 'feedback'];
    let currentPageIndex = -1; // -1 for home page
    let isTransitioning = false;
    let hoverTimeout;

    // Find current page index
    const currentPath = window.location.pathname;
    if (currentPath.includes('index.html') || currentPath.endsWith('/')) {
        currentPageIndex = -1; // Home page
    } else {
        pages.forEach((page, index) => {
            if (currentPath.includes(page)) {
                currentPageIndex = index;
            }
        });
    }

    // Function to navigate to page
    function navigateToPage(index) {
        if (isTransitioning || index === currentPageIndex) return;
        isTransitioning = true;

        const targetPage = currentPageIndex === -1 ? 
            `./pages/${pages[index]}.html` : // If on home page
            `${pages[index]}.html`;          // If on other pages
            
        window.location.href = targetPage;
    }

    // Add hover event listeners to nav links
    navLinks.forEach((link, index) => {
        link.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                if (!isTransitioning) {
                    navigateToPage(index);
                }
            }, 200); // Reduced delay for faster response
        });

        // Highlight current page
        if (index === currentPageIndex) {
            link.style.opacity = '1';
        }
    });

    // Clear hover timeout when mouse leaves
    navLinks.forEach(link => {
        link.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
        });
    });

    // Prevent default click behavior
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
        });
    });
}); 
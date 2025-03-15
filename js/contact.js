document.addEventListener('DOMContentLoaded', () => {
    // Contact icon functionality
    const emailLink = document.querySelector('.email-icon');
    const whatsappLink = document.querySelector('.whatsapp-icon');

    // Email click handler
    emailLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'mailto:paldeepak079@gmail.com';
    });

    // WhatsApp click handler
    whatsappLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://wa.me/916291667329', '_blank');
    });

    // Hover effects
    document.querySelectorAll('.contact-icon').forEach(icon => {
        icon.addEventListener('mouseenter', () => {
            icon.style.transform = 'translateY(-5px)';
            icon.querySelector('i').style.transform = 'scale(1.2)';
            icon.querySelector('.icon-label').style.opacity = '1';
            icon.querySelector('.icon-label').style.transform = 'translateY(0)';
        });

        icon.addEventListener('mouseleave', () => {
            icon.style.transform = 'translateY(0)';
            icon.querySelector('i').style.transform = 'scale(1)';
            icon.querySelector('.icon-label').style.opacity = '0';
            icon.querySelector('.icon-label').style.transform = 'translateY(10px)';
        });
    });
}); 
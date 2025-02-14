class BookingTabs {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-btn');
        this.sections = document.querySelectorAll('.booking-section');
        
        this.initializeTabs();
    }

    initializeTabs() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetSection = tab.dataset.tab;
                this.switchTab(targetSection);
            });
        });
    }

    switchTab(targetSection) {
        // Update tab buttons
        this.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === targetSection);
        });

        // Update sections
        this.sections.forEach(section => {
            section.classList.toggle('active', section.id === `${targetSection}-section`);
        });
    }
}

// Initialize tabs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BookingTabs();
}); 
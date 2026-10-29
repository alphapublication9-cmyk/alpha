/**
 * Alpha Publication - Cross-Device Live Analytics Tracker
 */

const AP_TRACKER = {
    // Send event to global backend API
    async sendEvent(action, params = {}) {
        try {
            const query = new URLSearchParams({ action, ...params }).toString();
            // Use native fetch with keepalive so clicks are not aborted on navigation
            fetch(`/api/stats?${query}`, { method: 'GET', keepalive: true }).catch(() => {});
        } catch (e) {
            console.warn('[Analytics] sendEvent error:', e);
        }
    },

    // Initialize Page View Tracking
    trackPageView() {
        const lastSession = sessionStorage.getItem('ap_view_sent');
        if (!lastSession) {
            sessionStorage.setItem('ap_view_sent', 'true');
            this.sendEvent('view', { page: window.location.pathname || 'Home' });
        }
    },

    // Track WhatsApp / Telegram Button Click
    trackActionClick(buttonName, buttonId) {
        this.sendEvent('click', { name: buttonName, btn: buttonId });
    }
};

// Initialize listeners on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    AP_TRACKER.trackPageView();

    // Attach click listeners to all WhatsApp & Telegram links
    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"], a[href*="t.me"]').forEach((btn, index) => {
        let label = btn.innerText.trim() || 'WhatsApp Button';
        let btnId = 'btn_' + index;

        if (btn.closest('header')) {
            label = 'Header — CHAT ON WHATSAPP';
            btnId = 'header';
        } else if (btn.closest('section') && (btn.innerText.includes('Apply Now') || btn.innerText.includes('WhatsApp'))) {
            label = 'Hero — Apply Now CTA';
            btnId = 'hero';
        } else if (btn.innerText.includes('Basic')) {
            label = 'Plan 1 — Basic (₹22,000)';
            btnId = 'plan1';
        } else if (btn.innerText.includes('Standard')) {
            label = 'Plan 2 — Standard Popular (₹30,000)';
            btnId = 'plan2';
        } else if (btn.innerText.includes('Premium')) {
            label = 'Plan 3 — Premium (₹48,000)';
            btnId = 'plan3';
        } else if (btn.closest('footer')) {
            label = 'Footer — Apply Now CTA';
            btnId = 'footer';
        } else if (btn.closest('#vacancy-modal')) {
            label = 'Modal Popup — Apply Now';
            btnId = 'modal';
        }

        btn.addEventListener('click', () => {
            AP_TRACKER.trackActionClick(label, btnId);
        });
    });
});

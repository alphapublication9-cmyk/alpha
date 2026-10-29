// Vercel Serverless Function for Live Cross-Device Analytics & Telegram Alerts

const TG_TOKEN = '8467287525:AAFE0qesjcivP87VbsjhSVZshy7EHpWAgFU';
const TG_CHAT = '8717315897';

// In-memory cache fallback for current instance
let memoryStats = {
    totalViews: 0,
    totalClicks: 0,
    buttons: {
        hero: 0,
        plan1: 0,
        plan2: 0,
        plan3: 0,
        header: 0,
        modal: 0,
        footer: 0,
        other: 0
    },
    events: []
};

// Function to send Telegram Alert
async function sendTelegram(text) {
    try {
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TG_CHAT,
                text: text,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.error('Telegram notification error:', e);
    }
}

// Format IST Date
function getISTDate() {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium'
    });
}

// Cloud KV / Bin Sync using KV REST or public bin sync
const CLOUD_SYNC_URL = 'https://kvdb.io/4yEwN3PjN5rQZk9hW8b8vT/ap_global_stats';

async function getCloudData() {
    try {
        const res = await fetch(CLOUD_SYNC_URL);
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
                return data;
            }
        }
    } catch (e) {}
    return memoryStats;
}

async function saveCloudData(data) {
    try {
        await fetch(CLOUD_SYNC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {}
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action } = req.query;
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown IP';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    let device = 'Desktop PC';
    if (/iPhone/i.test(userAgent)) device = 'iPhone (Safari)';
    else if (/iPad/i.test(userAgent)) device = 'iPad';
    else if (/Android/i.test(userAgent)) device = 'Android Mobile';
    else if (/Macintosh/i.test(userAgent)) device = 'MacOS';
    else if (/Windows/i.test(userAgent)) device = 'Windows PC';

    let stats = await getCloudData();
    if (!stats.buttons) stats.buttons = { ...memoryStats.buttons };
    if (!stats.events) stats.events = [];

    // 1. TRACK PAGE VIEW
    if (action === 'view') {
        stats.totalViews = (stats.totalViews || 0) + 1;
        const timeStr = getISTDate();

        const event = {
            id: Date.now(),
            type: 'PAGE_VIEW',
            desc: req.query.page || 'Home Page',
            device: device,
            ip: clientIp.split(',')[0],
            timestamp: timeStr
        };
        stats.events.unshift(event);
        if (stats.events.length > 200) stats.events.pop();

        await saveCloudData(stats);

        // Telegram Alert
        const tgMsg = `👁️ *NEW WEBSITE OPENED!*
━━━━━━━━━━━━━━━━━━━━
🌐 *Page:* ${req.query.page || 'Home / Main'}
⏰ *Time:* ${timeStr} (IST)
📱 *Device:* ${device}
🌐 *IP:* ${clientIp.split(',')[0]}
━━━━━━━━━━━━━━━━━━━━
📊 *Global Views Count:* #${stats.totalViews}`;

        sendTelegram(tgMsg);

        return res.status(200).json({ success: true, stats });
    }

    // 2. TRACK WHATSAPP / CTA BUTTON CLICK
    if (action === 'click') {
        stats.totalClicks = (stats.totalClicks || 0) + 1;
        const btnId = req.query.btn || 'other';
        const btnName = req.query.name || 'WhatsApp Button';
        const timeStr = getISTDate();

        stats.buttons[btnId] = (stats.buttons[btnId] || 0) + 1;

        const event = {
            id: Date.now(),
            type: 'WHATSAPP_CLICK',
            desc: btnName,
            device: device,
            ip: clientIp.split(',')[0],
            timestamp: timeStr
        };
        stats.events.unshift(event);
        if (stats.events.length > 200) stats.events.pop();

        await saveCloudData(stats);

        // Telegram Alert to Admin
        const tgMsg = `💬 *WHATSAPP BUTTON CLICKED!*
━━━━━━━━━━━━━━━━━━━━
🔘 *Button:* ${btnName}
⏰ *Time:* ${timeStr} (IST)
📱 *Device:* ${device}
🌐 *IP:* ${clientIp.split(',')[0]}
━━━━━━━━━━━━━━━━━━━━
🎯 *Total User Clicks:* #${stats.totalClicks}`;

        sendTelegram(tgMsg);

        return res.status(200).json({ success: true, stats });
    }

    // 3. RESET DATA (ADMIN ONLY)
    if (action === 'reset') {
        stats = {
            totalViews: 0,
            totalClicks: 0,
            buttons: {
                hero: 0,
                plan1: 0,
                plan2: 0,
                plan3: 0,
                header: 0,
                modal: 0,
                footer: 0,
                other: 0
            },
            events: []
        };
        await saveCloudData(stats);
        return res.status(200).json({ success: true, stats });
    }

    // DEFAULT: RETURN CURRENT STATS
    return res.status(200).json({ success: true, stats });
}

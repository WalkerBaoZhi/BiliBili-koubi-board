// api placeholder
const SERVER_URL = "https://api.chihiro.host/koubi";

// 简单后台速率限制（内存计数）
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 小时
const VIDEO_MAX_PER_WINDOW = 100; // 每视频每小时最多 100 次
const SENDER_MAX_PER_WINDOW = 200; // 每来源（sender）每小时最多 200 次

const videoCounters = new Map(); // videoId -> [timestamps]
const senderCounters = new Map(); // senderKey -> [timestamps]

function prune(arr, windowMs) {
    const now = Date.now();
    while (arr.length && now - arr[0] > windowMs) arr.shift();
}

function addAndCheckLimit(map, key, windowMs, limit) {
    if (!map.has(key)) map.set(key, []);
    const arr = map.get(key);
    prune(arr, windowMs);
    arr.push(Date.now());
    return arr.length <= limit;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "KOU_BI") {
        const payload = msg.payload || {};

        // 构造 senderKey（尽量基于 tab id / frame id / extension id）
        const senderKey = sender && (sender.tab ? `tab_${sender.tab.id}` : (sender.id || 'unknown'));

        try {
            const vid = payload.videoId || 'unknown_video';

            // 检查视频限速
            const okVideo = addAndCheckLimit(videoCounters, vid, RATE_WINDOW_MS, VIDEO_MAX_PER_WINDOW);
            if (!okVideo) {
                console.warn(`[Koubi] rate limit video ${vid}`);
                sendResponse({ ok: false, error: 'video_rate_limited' });
                return true;
            }

            // 检查来源限速
            const okSender = addAndCheckLimit(senderCounters, senderKey, RATE_WINDOW_MS, SENDER_MAX_PER_WINDOW);
            if (!okSender) {
                console.warn(`[Koubi] rate limit sender ${senderKey}`);
                sendResponse({ ok: false, error: 'sender_rate_limited' });
                return true;
            }
        } catch (e) {
            console.warn('[Koubi] rate check error', e);
        }

        // 转发到实际后端
        fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                videoId: payload.videoId,
                bvid: payload.bvid,
                title: payload.title,
                cover: payload.cover,
                amount: payload.amount,
                reason: payload.reason
            })
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("[Koubi] server response", data);
                sendResponse({ ok: true });
            })
            .catch((err) => {
                console.error("[Koubi] server error", err);
                sendResponse({ ok: false, error: err.toString() });
            });

        // 异步响应
        return true;
    }
});

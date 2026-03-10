console.log("Koubi MAIN script running");

/** =========================
 *  配置
 * ========================= */
const KOUBI_API = "https://red-sun-7766.walkerbaozhi.workers.dev/koubi";
const SECRET = "ajd82h1h2h1h2h1h2h1h2h1h2"; // 和 Worker 的 env.SECRET 一致
const QUEUE_KEY = "koubi_offline_queue_v1";

/** =========================
 *  工具：本地队列（离线缓存）
 * ========================= */
function loadQueue() {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveQueue(queue) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
        // 忽略
    }
}

function pushToQueue(item) {
    const q = loadQueue();
    q.push(item);
    saveQueue(q);
}

/** =========================
 *  工具：HMAC-SHA256 签名
 * ========================= */
async function hmacSHA256(key, message) {
    const enc = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
        "raw",
        enc.encode(key),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", keyData, enc.encode(message));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/** =========================
 *  发送扣币（带签名 + 离线队列）
 * ========================= */
async function sendKoubi({ videoId, title, cover = "", amount = 1 }) {
    const timestamp = Date.now();
    const message = videoId + timestamp;
    const signature = await hmacSHA256(SECRET, message);

    const payload = {
        videoId,
        title,
        cover,
        amount,
        timestamp,
        signature
    };

    try {
        const res = await fetch(KOUBI_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "unknown error");

        alert("扣币成功");
    } catch (err) {
        // 写入离线队列
        pushToQueue(payload);
        alert("网络异常，已离线排队扣币：" + err);
    }
}

/** =========================
 *  启动时尝试补发离线队列
 * ========================= */
async function flushQueue() {
    const queue = loadQueue();
    if (!queue.length) return;

    console.log("尝试补发离线扣币，数量：", queue.length);

    const remain = [];
    for (const item of queue) {
        try {
            const res = await fetch(KOUBI_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item)
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "unknown error");
        } catch (e) {
            // 这条还没发成功，留在队列里
            remain.push(item);
        }
    }

    saveQueue(remain);
    console.log("离线队列补发完成，剩余：", remain.length);
}

/** =========================
 *  创建扣币按钮
 * ========================= */
function createKoubiButton() {
    const btn = document.createElement("div");
    btn.id = "koubi-btn";

    btn.innerHTML = `<img src="${chrome.runtime.getURL("assets/icon.png")}" class="koubi-icon">`;

    btn.style.cursor = "pointer";
    btn.style.marginLeft = "10px";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.width = "28px";
    btn.style.height = "28px";
    btn.style.borderRadius = "50%";
    btn.style.background = "transparent";
    btn.style.padding = "0";
    btn.style.border = "none";

    btn.onclick = async () => {
        const videoId = getVideoId();
        const title = document.title || "";

        if (!videoId) {
            alert("未找到视频 ID，无法扣币");
            return;
        }

        await sendKoubi({ videoId, title, amount: 1 });
    };

    return btn;
}

//获取视频ID
function getVideoId() {
    try {
        // 新版 B 站
        if (window.__INITIAL_STATE__?.videoData?.aid)
            return window.__INITIAL_STATE__.videoData.aid;

        // 旧版 B 站
        if (window.__INITIAL_STATE__?.aid)
            return window.__INITIAL_STATE__.aid;

        // 从 URL 提取 BV 号
        const match = location.pathname.match(/BV([a-zA-Z0-9]+)/);
        if (match) return match[1];

        return "";
    } catch {
        return "";
    }
}

/** =========================
 *  DOM 挂载逻辑
 * ========================= */
function waitForElement(selector, callback) {
    const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
            clearInterval(timer);
            callback(el);
        }
    }, 500);
}

function mountButton(toolbar) {
    if (!toolbar) return;
    if (document.querySelector("#koubi-btn")) return;

    const btn = createKoubiButton();
    toolbar.appendChild(btn);
    console.log("扣币按钮挂载成功");
}

function observeToolbar() {
    const observer = new MutationObserver(() => {
        const toolbar = document.querySelector(
            ".video-toolbar, .toolbar-left, .video-toolbar-left, .video-toolbar-container"
        );
        mountButton(toolbar);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/** =========================
 *  启动：先补发队列，再挂按钮
 * ========================= */
flushQueue().catch(console.error);

waitForElement(
    ".video-toolbar, .toolbar-left, .video-toolbar-left, .video-toolbar-container",
    (toolbar) => {
        mountButton(toolbar);
        observeToolbar();
    }
);

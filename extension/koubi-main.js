console.log("Koubi MAIN script running");

/** =========================
 *  配置
 * ========================= */
const KOUBI_API = "https://api.chihiro.host/koubi";
// NOTE: 不再在客户端保存 SECRET（移除硬编码），直接信任前端并在客户端做速率限制
const QUEUE_KEY = "koubi_offline_queue_v1";

// 客户端速率限制配置（防止用户短时间内多次触发）
const CLIENT_RATE_LIMIT = {
    perVideoInterval: 10 * 60 * 1000, // 同一视频 10 分钟内只允许一次操作
    globalInterval: 60 * 60 * 1000, // 全局窗口 1 小时
    globalLimit: 20 // 全局窗口内最多允许 20 次操作
};

let clientSentHistory = []; // 全局发送时间戳数组
const clientSentPerVideo = {}; // videoId -> lastSendTimestamp

/** =========================
 *  工具：本地队列（离线缓存）
// 客户端已移除签名逻辑（不再持有 SECRET）
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

    // 客户端速率限制（初级保护）
    try {
        const now = Date.now();
        if (clientSentPerVideo[videoId] && now - clientSentPerVideo[videoId] < CLIENT_RATE_LIMIT.perVideoInterval) {
            alert('操作过快，请稍后再试');
            return;
        }

        clientSentPerVideo[videoId] = now;
        clientSentHistory.push(now);
        // 清理历史记录
        clientSentHistory = clientSentHistory.filter(t => now - t <= CLIENT_RATE_LIMIT.globalInterval);
        if (clientSentHistory.length > CLIENT_RATE_LIMIT.globalLimit) {
            alert('操作频繁，已到达上限，请稍后再试');
            return;
        }
    } catch (e) {
        // 不要阻塞主流程
        console.warn('[Koubi] client rate-check failed', e);
    }

    const payload = { videoId, title, cover, amount, timestamp };

    // 使用后台 service worker 转发（统一在后台做进一步限速/校验）
    try {
        chrome.runtime.sendMessage({ type: 'KOU_BI', payload }, (resp) => {
            if (resp && resp.ok) {
                alert('扣币成功');
            } else {
                // 后台返回错误或网络异常时写离线队列
                pushToQueue(payload);
                alert('网络异常或被限速，已离线排队扣币：' + (resp && resp.error ? resp.error : 'unknown'));
            }
        });
    } catch (err) {
        // 若 messaging 不可用，回退为离线队列
        pushToQueue(payload);
        alert('后台不可用，已离线排队扣币：' + err);
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
    // 节流补发：每条间隔 5 秒，避免瞬时洪峰
    for (const item of queue) {
        try {
            // 使用后台转发
            const sendPromise = new Promise((resolve) => {
                try {
                    chrome.runtime.sendMessage({ type: 'KOU_BI', payload: item }, (resp) => {
                        if (resp && resp.ok) resolve(true);
                        else resolve(false);
                    });
                } catch (e) { resolve(false); }
            });

            const ok = await sendPromise;
            if (!ok) {
                remain.push(item);
            }
        } catch (e) {
            remain.push(item);
        }

        // 等待 5 秒再发送下一条
        await new Promise(r => setTimeout(r, 5000));
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

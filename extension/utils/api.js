// api placeholder
const SERVER_URL = "https://api.chihiro.host/koubi";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "KOU_BI") {
        const payload = msg.payload;

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

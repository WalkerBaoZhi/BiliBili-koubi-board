// inject placeholder
(function () {
    console.log("[Koubi] inject.js loaded");

    // 简单等待页面渲染
    function ready(fn) {
        if (document.readyState === "complete" || document.readyState === "interactive") {
            setTimeout(fn, 0);
        } else {
            document.addEventListener("DOMContentLoaded", fn);
        }
    }

    function getVideoInfo() {
        try {
            const state = window.__INITIAL_STATE__;
            const aid = state?.aid || state?.videoData?.aid;
            const bvid = state?.bvid || state?.videoData?.bvid;
            const title = state?.videoData?.title || document.title.replace("_哔哩哔哩_bilibili", "");
            const cover =
                document.querySelector("meta[itemprop='image']")?.content ||
                state?.videoData?.pic ||
                "";

            return { aid, bvid, title, cover };
        } catch (e) {
            console.warn("[Koubi] getVideoInfo error", e);
            return null;
        }
    }

    function createKoubiButton() {
        const info = getVideoInfo();
        if (!info || !info.aid) {
            console.warn("[Koubi] no video info");
            return;
        }

        // 找到投币按钮容器（B站可能会改样式，这里只是一个起点）
        const coinBtn = document.querySelector(".video-toolbar .coin, .video-toolbar .coin-btn, .video-toolbar-left .coin");
        if (!coinBtn) {
            console.warn("[Koubi] coin button not found");
            return;
        }

        // 避免重复添加
        if (document.querySelector(".koubi-btn")) return;

        const btn = document.createElement("button");
        btn.innerText = "扣币";
        btn.className = "koubi-btn";
        btn.style.marginLeft = "8px";
        btn.style.padding = "4px 10px";
        btn.style.borderRadius = "4px";
        btn.style.border = "1px solid #f25d8e";
        btn.style.background = "#fff0f5";
        btn.style.color = "#f25d8e";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "12px";

        let cooling = false;

        btn.addEventListener("click", () => {
            if (cooling) return;
            cooling = true;
            btn.innerText = "已扣…";

            window.postMessage(
                {
                    type: "KOU_BI_ACTION",
                    payload: {
                        videoId: info.aid,
                        bvid: info.bvid,
                        title: info.title,
                        cover: info.cover,
                        amount: 1,
                        reason: "离谱"
                    }
                },
                "*"
            );

            setTimeout(() => {
                btn.innerText = "扣币";
                cooling = false;
            }, 800);
        });

        coinBtn.parentNode.insertBefore(btn, coinBtn.nextSibling);
    }

    // 监听来自页面的消息 → 转给扩展（通过 window.postMessage → content-script → background/page）
    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== "KOU_BI_ACTION") return;

        const payload = event.data.payload;
        // 调用扩展的 API（通过 chrome.runtime）
        chrome.runtime.sendMessage(
            {
                type: "KOU_BI",
                payload
            },
            (res) => {
                console.log("[Koubi] sendMessage result", res);
            }
        );
    });

    ready(() => {
        // 初次尝试
        createKoubiButton();
        // 防止 B 站异步渲染，轮询几次
        let tries = 0;
        const timer = setInterval(() => {
            if (document.querySelector(".koubi-btn")) {
                clearInterval(timer);
                return;
            }
            createKoubiButton();
            tries++;
            if (tries > 10) clearInterval(timer);
        }, 1000);
    });
})();

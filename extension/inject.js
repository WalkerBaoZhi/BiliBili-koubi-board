console.log("Koubi inject.js running🚀");

(function () {
    function waitForElement(selector, callback) {
        const timer = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(timer);
                callback(el);
            }
        }, 500);
    }

    waitForElement(".video-toolbar, .toolbar-left, .video-toolbar-left, .video-toolbar-container", (toolbar) => {
        console.log("找到工具栏:", toolbar);

        const btn = document.createElement("div");
        btn.innerText = "扣币";
        btn.style.cursor = "pointer";
        btn.style.padding = "6px 12px";
        btn.style.marginLeft = "10px";
        btn.style.background = "#ff5c5c";
        btn.style.color = "#fff";
        btn.style.borderRadius = "6px";
        btn.style.fontSize = "14px";

        btn.onclick = () => {
            const videoId = window.__INITIAL_STATE__?.aid || "";
            const title = document.title;

            fetch("https://api.chihiro.host/koubi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoId,
                    title,
                    cover: "",
                    amount: 1
                })
            })
                .then((res) => res.json())
                .then(() => alert("扣币成功"))
                .catch((err) => alert("扣币失败：" + err));
        };

        toolbar.appendChild(btn);
    });
})();

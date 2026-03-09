// content-script placeholder
(function () {
    // 防止重复注入
    if (window.__KoubiInjected__) return;
    window.__KoubiInjected__ = true;

    function injectScript(file) {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL(file);
        script.type = "text/javascript";
        (document.head || document.documentElement).appendChild(script);
        script.onload = () => script.remove();
    }

    // 注入页面上下文脚本（可以访问 window.__INITIAL_STATE__）
    injectScript("inject.js");
})();

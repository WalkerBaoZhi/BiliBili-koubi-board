console.log("Koubi content script loaded💡");

(function () {
    if (window.__KoubiInjected__) return;
    window.__KoubiInjected__ = true;

    function injectScript(file) {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL(file);
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
    }

    injectScript("inject.js");
})();

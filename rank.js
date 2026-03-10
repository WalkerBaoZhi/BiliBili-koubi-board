// rank placeholder
const DATA_URL = "https://red-sun-7766.walkerbaozhi.workers.dev/data.json";

const listEl = document.getElementById("list");
const tabs = document.querySelectorAll(".tabs button");

let db = null;

function filterByRange(history, range) {
    if (range === "total") {
        return history.reduce((sum, h) => sum + h.amount, 0);
    }

    const now = Date.now();
    let ms = 0;
    if (range === "day") ms = 1 * 24 * 60 * 60 * 1000;
    if (range === "week") ms = 7 * 24 * 60 * 60 * 1000;
    if (range === "month") ms = 30 * 24 * 60 * 60 * 1000;

    return history
        .filter((h) => now - h.time <= ms)
        .reduce((sum, h) => sum + h.amount, 0);
}

function render(range) {
    if (!db) return;

    const records = db.records || {};
    const arr = Object.entries(records)
        .map(([id, item]) => {
            const score = filterByRange(item.history || [], range);
            return {
                id,
                title: item.title,
                cover: item.cover,
                total: item.total,
                score
            };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);

    listEl.innerHTML = "";

    if (arr.length === 0) {
        listEl.innerHTML = `<div style="font-size:14px;color:#666;">当前榜单暂无数据。</div>`;
        return;
    }

    arr.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "item";

        const cover = document.createElement("img");
        cover.className = "item-cover";
        cover.src = item.cover || "";
        cover.onerror = () => {
            cover.style.background = "#ccc";
        };

        const main = document.createElement("div");
        main.className = "item-main";

        const title = document.createElement("div");
        title.className = "item-title";
        title.innerText = `${idx + 1}. ${item.title}`;

        const meta = document.createElement("div");
        meta.className = "item-meta";
        meta.innerText = `扣币：${item.score}`;

        main.appendChild(title);
        main.appendChild(meta);

        div.appendChild(cover);
        div.appendChild(main);

        div.addEventListener("click", () => {
            window.open(`https://www.bilibili.com/video/av${item.id}`, "_blank");
        });

        listEl.appendChild(div);
    });
}

function setActiveTab(range) {
    tabs.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.range === range);
    });
}

tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
        const range = btn.dataset.range;
        setActiveTab(range);
        render(range);
    });
});

fetch(DATA_URL)
    .then((res) => res.json())
    .then((data) => {
        db = data;
        render("total");
    })
    .catch((err) => {
        console.error("load data error", err);
        listEl.innerHTML = `<div style="font-size:14px;color:#666;">加载失败。</div>`;
    });

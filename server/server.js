import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { mergeKoubiRecord } from "./data-merge.js";

const app = express();
app.use(express.json());
app.use(cors());

const DATA_FILE = path.resolve("data.json");

// 读取本地 data.json
function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        return { records: {} };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

// 写入本地 data.json
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 健康检查
app.get("/", (req, res) => {
    res.send("Koubi server is running.");
});

// 扣币 API
app.post("/koubi", (req, res) => {
    try {
        const payload = req.body;

        if (!payload.videoId) {
            return res.status(400).json({ ok: false, error: "missing videoId" });
        }

        // 1. 读取本地数据
        const db = loadData();

        // 2. 合并扣币记录
        const newDb = mergeKoubiRecord(db, payload);

        // 3. 写回本地文件
        saveData(newDb);

        res.json({ ok: true });
    } catch (err) {
        console.error("Koubi server error:", err);
        res.status(500).json({ ok: false, error: err.toString() });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Koubi server running on http://localhost:${PORT}`);
});

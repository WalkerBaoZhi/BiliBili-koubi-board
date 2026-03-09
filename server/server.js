// server entry placeholder
import express from "express";
import cors from "cors";
import { getData, updateData } from "./github.js";
import { mergeKoubiRecord } from "./data-merge.js";

const app = express();
app.use(express.json());
app.use(cors());

// 健康检查
app.get("/", (req, res) => {
    res.send("Koubi server is running.");
});

// 扣币 API
app.post("/koubi", async (req, res) => {
    try {
        const payload = req.body;

        if (!payload.videoId) {
            return res.status(400).json({ ok: false, error: "missing videoId" });
        }

        // 1. 拉取 GitHub 数据
        const db = await getData();

        // 2. 合并扣币记录
        const newDb = mergeKoubiRecord(db, payload);

        // 3. 写回 GitHub
        await updateData(newDb);

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

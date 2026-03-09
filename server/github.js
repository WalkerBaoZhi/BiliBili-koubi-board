// github api placeholder
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
const FILE_PATH = process.env.FILE_PATH;

const RAW_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${FILE_PATH}`;
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

export async function getData() {
    const res = await axios.get(RAW_URL, {
        headers: { "Cache-Control": "no-cache" }
    });
    return res.data;
}

export async function updateData(content) {
    // 获取当前文件 SHA
    const shaRes = await axios.get(API_URL, {
        headers: { Authorization: `token ${TOKEN}` }
    });

    const sha = shaRes.data.sha;

    // 更新文件
    await axios.put(
        API_URL,
        {
            message: "update koubi data",
            content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
            sha
        },
        {
            headers: { Authorization: `token ${TOKEN}` }
        }
    );
}

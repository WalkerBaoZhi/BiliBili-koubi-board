// data-merge placeholder
export function mergeKoubiRecord(db, payload) {
    const { videoId, title, cover, amount, reason } = payload;

    if (!db.records) db.records = {};

    if (!db.records[videoId]) {
        db.records[videoId] = {
            title,
            cover,
            total: 0,
            history: []
        };
    }

    db.records[videoId].total += amount;

    db.records[videoId].history.push({
        time: Date.now(),
        amount,
        reason: reason || ""
    });

    return db;
}

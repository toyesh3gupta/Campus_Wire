const express = require("express");
const router = express.Router();
const db = require("../db");

// Get public profile (no token needed)
router.get("/:id", async (req, res) => {
    try {
        const userId = req.params.id;

        const [rows] = await db.query(
            "SELECT user_id, name, dept, year, created_at, warning_count FROM user WHERE user_id = ?",
            [userId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

module.exports = router;

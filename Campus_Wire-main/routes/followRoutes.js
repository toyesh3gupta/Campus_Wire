const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to get user from token
function auth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next(); //this is a next function
    } catch {
        return res.status(401).json({ error: "Invalid token" });//invalid tokens will be returned via proper error handling 
    }
}

// ➤ FOLLOW a user
router.post('/follow', auth, async (req, res) => {
    const { target_id } = req.body;
    const me = req.user.user_id;

    if (me === target_id) 
        return res.status(400).json({ error: "Cannot follow yourself" });

    try {
        await pool.query(
            "INSERT IGNORE INTO Followers (follower_id, following_id) VALUES (?, ?)",
            [me, target_id]
        );
        res.json({ message: "Followed" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ➤ UNFOLLOW user
router.post('/unfollow', auth, async (req, res) => {
    const { target_id } = req.body;
    const me = req.user.user_id;

    try {
        await pool.query(
            "DELETE FROM Followers WHERE follower_id=? AND following_id=?",
            [me, target_id]
        );
        res.json({ message: "Unfollowed" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ➤ Get followers count
router.get('/followers/:uid', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.user_id, u.name, u.dept, u.year
             FROM Followers f
             JOIN user u ON u.user_id = f.follower_id
             WHERE f.following_id = ?`,
            [req.params.uid]
        );

        res.json({
            count: rows.length,
            list: rows
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



// ➤ Get following count
router.get('/following/:uid', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.user_id, u.name, u.dept, u.year
             FROM Followers f
             JOIN user u ON u.user_id = f.following_id
             WHERE f.follower_id = ?`,
            [req.params.uid]
        );

        res.json({
            count: rows.length,
            list: rows
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



// ➤ Check if currentUser is following target
// router.get('/is-following/:uid', auth, async (req, res) => {
//     const me = req.user.user_id;
//     const target = req.params.uid;

//     const [rows] = await pool.query(
//         "SELECT * FROM Followers WHERE follower_id=? AND following_id=?",
//         [me, target]
//     );

//     res.json({ isFollowing: rows.length > 0 });
// });
router.get('/is-following/:uid', auth, async (req, res) => {
    const me = req.user.user_id;
    const target = req.params.uid;

    const [rows] = await pool.query(
        "SELECT * FROM Followers WHERE follower_id=? AND following_id=?",
        [me, target]
    );

    res.json({ isFollowing: rows.length > 0 });
});

module.exports = router;

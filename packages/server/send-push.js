// send-push.js
require("dotenv").config();
const webpush = require("web-push");
const { Pool } = require("pg");

// Load env vars
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
const databaseUrl = process.env.DATABASE_URL;

if (!publicVapidKey || !privateVapidKey) {
    console.error("❌ VAPID keys are missing in .env");
    process.exit(1);
}

webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);

// Postgres pool
const pool = new Pool({ connectionString: databaseUrl });

(async () => {
    try {
        // 1️⃣ Pick a test mobile number (must already be subscribed!)
        const mobile = process.argv[2];
        if (!mobile) {
            console.error("Usage: node send-push.js <mobile>");
            process.exit(1);
        }

        // 2️⃣ Get subscription from DB
        const { rows } = await pool.query(
            "SELECT subscription FROM push_subscriptions WHERE mobile = $1",
            [mobile]
        );

        if (!rows.length) {
            console.error(`❌ No subscription found for mobile: ${mobile}`);
            process.exit(1);
        }

        const subscription = rows[0].subscription;

        // 3️⃣ Send test push notification
        const payload = JSON.stringify({
            title: "Test Notification",
            body: `Hello ${mobile}, this is a test push 🚀`,
            url: "/track",
        });

        await webpush.sendNotification(subscription, payload);

        console.log("✅ Push notification sent successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Push send error:", err);
        process.exit(1);
    }
})();

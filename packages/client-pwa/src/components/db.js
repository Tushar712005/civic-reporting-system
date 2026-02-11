// src/db.js
import Dexie from "dexie";

// Create an IndexedDB database
const db = new Dexie("CivicAppDB");

// Define tables
db.version(1).stores({
    pendingReports: "++id,title,category,mobile,latitude,longitude,photo,createdAt",
    pendingFeedback: "++id,reportId,message,createdAt",
    cachedIssues: "id,title,category,status,distance",
    cachedAnalytics: "department",
});

export default db;

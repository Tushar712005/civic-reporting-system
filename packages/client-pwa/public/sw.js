/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */
/* global idb */

// ✅ Service Worker with Push, Caching, and Background Sync

// ========== 0. CONFIG ==========
const STATIC_CACHE = "civic-static-v2"; // bump version to force update
const API_CACHE = "civic-api-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/badge.png",
];

// Detect API base (dev vs prod)
const API_BASE =
  self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : self.location.origin;
const API_BASE_URL = new URL(API_BASE);

// ========== 1. STATIC ASSET CACHING ==========
self.addEventListener("install", (event) => {
  console.log("[SW] Installing…");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  // Activate worker immediately after install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating…");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Helper: cache-first for static
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

// Helper: network-first for API GET
async function apiNetworkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

// Intercept fetch requests
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API GET requests → network-first with cache fallback
  if (
    event.request.method === "GET" &&
    url.origin === API_BASE_URL.origin &&
    url.pathname.startsWith("/api/")
  ) {
    event.respondWith(apiNetworkFirst(event.request));
    return;
  }

  // Other requests (static assets, pages) → cache-first
  event.respondWith(cacheFirst(event.request));
});

// ========== 2. PUSH NOTIFICATIONS ==========
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received raw:", event.data ? event.data.text() : "(no data)");

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Notification", body: event.data.text() };
  }

  console.log("[SW] Parsed push data:", data);

  const title = data.title || "Notification";
  const options = {
    body: data.body || "You have a new update",
    // use placeholder icons while testing to rule out broken paths
    icon: "https://via.placeholder.com/128",
    badge: "https://via.placeholder.com/32",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click", event.notification.data);
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
        return null;
      })
  );
});

// ========== 3. BACKGROUND SYNC ==========
// Bring in idb helper (fixes "idb is not defined" when using the IIFE build)
importScripts("https://cdn.jsdelivr.net/npm/idb@7/build/iife/index-min.js");

async function openLocalDB() {
  // Ensure the stores we need exist.
  return idb.openDB("CivicAppDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("pendingReports")) {
        db.createObjectStore("pendingReports", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("pendingFeedback")) {
        db.createObjectStore("pendingFeedback", { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

// Sync pending reports
async function syncReports() {
  const db = await openLocalDB();
  const tx = db.transaction("pendingReports", "readwrite");
  const store = tx.objectStore("pendingReports");
  const allReports = await store.getAll();

  for (const report of allReports) {
    const formData = new FormData();
    formData.append("title", report.title);
    formData.append("category", report.category);
    formData.append("mobile", report.mobile);
    formData.append("latitude", report.latitude);
    formData.append("longitude", report.longitude);
    if (report.photo) formData.append("photo", report.photo);

    try {
      await fetch(`${API_BASE}/api/issues`, { method: "POST", body: formData });
      await store.delete(report.id);
      console.log("[SW] ✅ Synced report", report.id);
    } catch (err) {
      console.error("[SW] ❌ Report sync failed", err);
    }
  }
  await tx.done;
}

// Sync pending feedback
async function syncFeedback() {
  const db = await openLocalDB();
  const tx = db.transaction("pendingFeedback", "readwrite");
  const store = tx.objectStore("pendingFeedback");
  const allFeedback = await store.getAll();

  for (const fb of allFeedback) {
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: fb.reportId, message: fb.message }),
      });
      await store.delete(fb.id);
      console.log("[SW] ✅ Synced feedback", fb.id);
    } catch (err) {
      console.error("[SW] ❌ Feedback sync failed", err);
    }
  }
  await tx.done;
}

// Listen for sync events
self.addEventListener("sync", (event) => {
  console.log("[SW] Sync event", event.tag);
  if (event.tag === "sync-reports") {
    event.waitUntil(syncReports());
  }
  if (event.tag === "sync-feedback") {
    event.waitUntil(syncFeedback());
  }
});

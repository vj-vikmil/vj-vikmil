// Firebase Online Tracker
export const initOnlineTracker = (onCountUpdate: (count: number) => void) => {
  // Dynamically import Firebase modules
  Promise.all([
    import("https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js")
  ]).then(([firebaseApp, firebaseDb]) => {
    const { initializeApp } = firebaseApp;
    const { getDatabase, ref, set, onValue, onDisconnect, remove } = firebaseDb;

    const firebaseConfig = {
      apiKey: "AIzaSyDZMCYEs9EGTjHKCFKkFAx-qB5dDzmxHMM",
      authDomain: "online-now-f1628.firebaseapp.com",
      databaseURL: "https://online-now-f1628-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "online-now-f1628",
      storageBucket: "online-now-f1628.firebasestorage.app",
      messagingSenderId: "876159780240",
      appId: "1:876159780240:web:3969ef80b224b54ff69f15",
      measurementId: "G-VXJMJP1Z87"
    };

    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    const sessionId = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const presenceRef = ref(db, `presence/${sessionId}`);
    
    const heartbeat = () => set(presenceRef, Date.now());
    heartbeat();
    onDisconnect(presenceRef).remove();
    setInterval(heartbeat, 25000);

    const onlineRef = ref(db, "presence");
    const STALE_AFTER = 60000;
    
    onValue(onlineRef, (snap: any) => {
      const val = snap.val() || {};
      const now = Date.now();
      let count = 0;
      
      for (const [key, ts] of Object.entries(val)) {
        if (typeof ts === "number" && now - ts <= STALE_AFTER) {
          count++;
        } else {
          remove(ref(db, `presence/${key}`));
        }
      }
      
      onCountUpdate(count);
    });
  }).catch((err) => {
    console.error("Firebase init error:", err);
    onCountUpdate(0);
  });
};



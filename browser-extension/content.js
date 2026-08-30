// Runs on Study OS domains (localhost:3000, study-os-five-tau.vercel.app)

let lastState = null;

function checkTimerState() {
  try {
    const stateStr = localStorage.getItem("study_os_timer_state");
    if (stateStr !== lastState) {
      lastState = stateStr;
      const state = stateStr ? JSON.parse(stateStr) : { isRunning: false, isPaused: false, session_id: null };
      chrome.runtime.sendMessage({
        type: "TIMER_STATE_CHANGED",
        state
      });
    }
  } catch {
    // ignore
  }
}

// Check every second to catch changes
setInterval(checkTimerState, 1000);
checkTimerState();

// Also listen for storage events from other tabs
window.addEventListener("storage", (e) => {
  if (e.key === "study_os_timer_state") {
    checkTimerState();
  }
});

// Listen for messages from background.js to log distractions
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "LOG_DISTRACTION") {
    const { domain, session_id } = message.payload;
    fetch("/api/extension/log-distraction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, session_id, event_type: "distraction_start", duration_seconds: 10 })
    }).catch(console.error);
  }
});


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
  }
}

setInterval(checkTimerState, 1000);
checkTimerState();

window.addEventListener("storage", (e) => {
  if (e.key === "study_os_timer_state") {
    checkTimerState();
  }
});

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

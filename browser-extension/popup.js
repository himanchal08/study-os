document.addEventListener("DOMContentLoaded", () => {
  const dot = document.getElementById("status-dot");
  const notConnected = document.getElementById("not-connected");
  const connected = document.getElementById("connected");
  const sessionStatus = document.getElementById("session-status");
  const distractionCount = document.getElementById("distraction-count");

  function updateUI(state) {
    if (!state.isAuthenticated) {
      notConnected.classList.remove("hidden");
      connected.classList.add("hidden");
      dot.classList.remove("active");
      return;
    }

    notConnected.classList.add("hidden");
    connected.classList.remove("hidden");

    if (state.isSessionActive) {
      dot.classList.add("active");
      sessionStatus.textContent = "Study session active ⏱";
      sessionStatus.style.color = "#10b981";
    } else {
      dot.classList.remove("active");
      sessionStatus.textContent = "No active timer.";
      sessionStatus.style.color = "#ededed";
    }

    distractionCount.textContent = `Distractions logged: ${state.distractionCount || 0}`;
  }

  // Request initial state from background
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response) updateUI(response);
  });

  // Listen for state changes
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "STATE_UPDATE") {
      updateUI(message.state);
    }
  });
});

let isSessionActive = false;
let currentSessionId = null;
let distractionCount = 0;

const DISTRACTION_DOMAINS = [
  "youtube.com",
  "reddit.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "netflix.com",
  "tiktok.com",
  "twitch.tv"
];

// When the Study OS tab sends us its state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TIMER_STATE_CHANGED") {
    const { isRunning, isPaused, session_id } = message.state;
    const active = isRunning && !isPaused;
    
    if (active !== isSessionActive) {
      isSessionActive = active;
      currentSessionId = session_id;
      if (!isSessionActive) {
        distractionCount = 0; // reset when timer stops
      }
      broadcastState();
    }
  } else if (message.type === "GET_STATE") {
    sendResponse({
      isAuthenticated: true,
      isSessionActive,
      distractionCount
    });
  }
});

function broadcastState() {
  chrome.runtime.sendMessage({
    type: "STATE_UPDATE",
    state: { isAuthenticated: true, isSessionActive, distractionCount }
  }).catch(() => {});
}

// Watch tabs to detect distractions
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    checkTabDistraction(tab);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  checkTabDistraction(tab);
});

function checkTabDistraction(tab) {
  if (!isSessionActive || !tab.url) return;
  
  try {
    const url = new URL(tab.url);
    const isDistraction = DISTRACTION_DOMAINS.some(domain => url.hostname.includes(domain));
    
    if (isDistraction) {
      logDistraction(tab.url);
    }
  } catch {
    // invalid url
  }
}

// Throttle logging to prevent spam
let lastLogTime = 0;

function logDistraction(urlStr) {
  const now = Date.now();
  if (now - lastLogTime < 10000) return; // Only log once every 10s max per trigger
  lastLogTime = now;

  distractionCount++;
  broadcastState();

  try {
    const urlObj = new URL(urlStr);
    const domain = urlObj.hostname;

    // Find the Study OS tab and ask it to log the distraction
    chrome.tabs.query({ url: "*://localhost/*" }, (tabs) => {
      let studyTabs = tabs;
      if (studyTabs.length === 0) {
        chrome.tabs.query({ url: "*://study-os-five-tau.vercel.app/*" }, (prodTabs) => {
          sendToTab(prodTabs[0], domain);
        });
      } else {
        sendToTab(studyTabs[0], domain);
      }
    });
  } catch {}
}

function sendToTab(tab, domain) {
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, {
    type: "LOG_DISTRACTION",
    payload: {
      domain,
      session_id: currentSessionId
    }
  }).catch(() => {});
}

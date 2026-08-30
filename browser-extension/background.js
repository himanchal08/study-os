let isSessionActive = false;
let currentSessionId = null;
let currentActivityType = null;
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

// Handle 5-minute distraction warnings
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "distraction_warning" && isSessionActive) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png", // Even if missing, Chrome will fallback
      title: "Focus Check! 🎯",
      message: "You've been distracted for over 5 minutes. Time to get back to studying!",
      priority: 2
    });
    
    // Clear it so it doesn't spam, they got the warning
    chrome.alarms.clear("distraction_warning");
  }
});

// When the Study OS tab sends us its state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TIMER_STATE_CHANGED") {
    const { isRunning, isPaused, session_id, activity_type } = message.state;
    const active = isRunning && !isPaused;
    
    if (active !== isSessionActive || activity_type !== currentActivityType) {
      isSessionActive = active;
      currentSessionId = session_id;
      currentActivityType = activity_type;
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
  // SPAs like YouTube update the URL first, then the title later.
  if (changeInfo.url || changeInfo.title) {
    checkTabDistraction(tab);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  checkTabDistraction(tab);
});

function evaluateDistraction(urlStr, title) {
  try {
    const url = new URL(urlStr);
    const domain = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    const t = (title || "").toLowerCase();

    // Not on our radar? Not a distraction.
    if (!DISTRACTION_DOMAINS.some(d => domain.includes(d))) {
      return false; 
    }

    // 1. YouTube specific logic
    if (domain.includes("youtube.com")) {
      if (path.includes("/shorts")) return true; // Shorts are always distractions
      if (path === "/" || path === "") return true; // Homepage is a distraction

      if (path === "/watch") {
        // Algorithmic evaluation of the title
        const studyKeywords = ["study", "lecture", "course", "tutorial", "class", "ssc", "upsc", "banking", "jee", "neet", "code", "learn", "chapter", "syllabus", "revision", "concept", "exam", "prep", "strategy"];
        
        const isEducational = studyKeywords.some(kw => t.includes(kw));

        // It is a distraction if the title is NOT educational
        return !isEducational;
      }

      return true;
    }

    // 2. Reddit specific logic
    if (domain.includes("reddit.com")) {
      const educationalSubreddits = ["/r/upsc", "/r/ssc", "/r/jeeneetards", "/r/study", "/r/banking", "/r/learnprogramming"];
      if (educationalSubreddits.some(sub => path.startsWith(sub))) {
        return false;
      }
      return true; // Any other reddit page is a distraction
    }

    // For all other domains (Instagram, Netflix, TikTok, etc), it's always a distraction
    return true;
  } catch {
    return false;
  }
}

function checkTabDistraction(tab) {
  if (!isSessionActive || !tab.url) {
    chrome.alarms.clear("distraction_warning");
    return;
  }
  
  const isDistraction = evaluateDistraction(tab.url, tab.title);
  
  if (isDistraction) {
    logDistraction(tab.url);
    
    // Check if alarm already exists, if not, create one for 5 minutes
    chrome.alarms.get("distraction_warning", (alarm) => {
      if (!alarm) {
        chrome.alarms.create("distraction_warning", { delayInMinutes: 5 });
      }
    });
  } else {
    // If they switched to a non-distracting tab, clear the warning timer!
    chrome.alarms.clear("distraction_warning");
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

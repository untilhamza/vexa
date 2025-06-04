// FINAL WORKING VERSION - Based on debug findings
// Paste this into your browser console while in a Google Meet

(function () {
  console.log("🎯 Starting FINAL WORKING Speaker Detection...");

  let participantNodes = [];
  let pollingInterval = null;
  let lastActiveSpeaker = null;
  let deviceToParticipantMap = new Map(); // Map device IDs to participant names

  // Create mapping between device IDs and participant names
  const buildDeviceMapping = () => {
    // Clear existing mapping
    deviceToParticipantMap.clear();

    // Find all elements with data-participant-id
    const allVideoElements = document.querySelectorAll("[data-participant-id]");

    allVideoElements.forEach((el) => {
      const deviceId = el.getAttribute("data-participant-id");
      if (!deviceId) return;

      // Try to find participant name in various ways
      let participantName = null;

      // Method 1: Look for name in the element or nearby
      const nameSelectors = [
        ".zWGUib",
        "[data-self-name]",
        ".participant-name",
        ".cS7aqe.N2K3jd",
        '[data-tooltip*="name"]',
      ];

      for (const selector of nameSelectors) {
        const nameEl =
          el.querySelector(selector) ||
          el.closest(`*`).querySelector(selector) ||
          document.querySelector(
            `[data-participant-id="${deviceId}"] ${selector}`
          );

        if (nameEl && nameEl.textContent?.trim()) {
          participantName = nameEl.textContent.split("\n").pop()?.trim();
          break;
        }
      }

      // Method 2: Use our participant nodes mapping
      if (!participantName) {
        // Try to correlate with participant list
        const participant = participantNodes.find((p) => {
          // Check if this device ID appears anywhere in the participant element
          return (
            p.el.querySelector(`[data-participant-id="${deviceId}"]`) ||
            p.el.closest(`[data-participant-id="${deviceId}"]`) ||
            p.id === deviceId
          );
        });

        if (participant) {
          participantName = participant.name;
        }
      }

      // Method 3: Look in parent/sibling elements for names
      if (!participantName) {
        let current = el;
        for (let i = 0; i < 5; i++) {
          // Check 5 levels up
          if (current.parentElement) {
            current = current.parentElement;
            for (const selector of nameSelectors) {
              const nameEl = current.querySelector(selector);
              if (nameEl && nameEl.textContent?.trim()) {
                participantName = nameEl.textContent.split("\n").pop()?.trim();
                break;
              }
            }
            if (participantName) break;
          }
        }
      }

      if (
        participantName &&
        participantName !== "Unknown" &&
        participantName.length > 0
      ) {
        deviceToParticipantMap.set(deviceId, participantName);
        console.log(
          `📍 Mapped device ${deviceId.split("/").pop()} → ${participantName}`
        );
      }
    });

    console.log(
      `🗺️ Created mapping for ${deviceToParticipantMap.size} devices`
    );
  };

  // Detect active speaker using largest video element
  const detectActiveSpeakerBySize = () => {
    const videoElements = document.querySelectorAll("[data-participant-id]");
    let largestElement = null;
    let maxArea = 0;

    videoElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;

      // Only consider substantial video elements (not tiny UI elements)
      if (area > 10000) {
        // Minimum 100x100 area
        if (area > maxArea) {
          maxArea = area;
          largestElement = {
            element: el,
            deviceId: el.getAttribute("data-participant-id"),
            area: Math.round(area),
            size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          };
        }
      }
    });

    if (largestElement) {
      const participantName = deviceToParticipantMap.get(
        largestElement.deviceId
      );
      if (participantName) {
        return {
          speaker: participantName,
          method: `largest-video:${largestElement.size}:${largestElement.area}`,
          deviceId: largestElement.deviceId,
        };
      }
    }

    return null;
  };

  // Helper function to get participant name from people list
  const getParticipantName = (participantEl) => {
    const nameSelectors = [
      "[data-self-name]",
      ".zWGUib",
      ".cS7aqe.N2K3jd",
      '[data-tooltip*="name"]',
      ".participant-name",
    ];

    for (const selector of nameSelectors) {
      const nameEl = participantEl.querySelector(selector);
      if (nameEl && nameEl.innerText?.trim()) {
        return nameEl.innerText.split("\n").pop()?.trim() || "Unknown";
      }
    }
    return "Unknown Participant";
  };

  // Ensure people panel is open
  const ensurePeoplePanelOpen = async () => {
    const peopleButton = document.querySelector(
      'button[aria-label="People"][data-panel-id="1"]'
    );
    if (!peopleButton) {
      console.log("❌ People button not found");
      return false;
    }
    const isPressed = peopleButton.getAttribute("aria-pressed");
    if (isPressed !== "true") {
      console.log("📋 Opening People panel...");
      peopleButton.click();
      await new Promise((r) => setTimeout(r, 1500));
    }
    return true;
  };

  // Main polling function
  const startWorkingPolling = () => {
    let nodeRefreshCounter = 0;

    pollingInterval = setInterval(async () => {
      nodeRefreshCounter++;

      // Refresh participant nodes and device mapping every 50 cycles
      if (nodeRefreshCounter % 50 === 1) {
        if (!(await ensurePeoplePanelOpen())) {
          console.log("❌ Cannot ensure people panel is open");
          return;
        }

        // Refresh participant list
        participantNodes = [];
        const participantElements = Array.from(
          document.querySelectorAll('div[role="listitem"][data-participant-id]')
        );

        console.log(
          `🔍 Found ${participantElements.length} participant elements`
        );

        participantElements.forEach((el) => {
          const participantId = el.getAttribute("data-participant-id");
          if (!participantId) return;

          const name = getParticipantName(el);

          if (name) {
            participantNodes.push({
              id: participantId,
              name: name,
              el: el,
            });
          }
        });

        console.log(
          `✅ Monitoring ${
            participantNodes.length
          } participants: ${participantNodes.map((p) => p.name).join(", ")}`
        );

        // Build device mapping
        buildDeviceMapping();
      }

      // Detect active speaker using video size
      const detection = detectActiveSpeakerBySize();

      if (detection) {
        if (detection.speaker !== lastActiveSpeaker) {
          if (lastActiveSpeaker) {
            console.log(`🤐 ${lastActiveSpeaker} STOPPED speaking`);
          }
          console.log(
            `🗣️ ${detection.speaker} STARTED speaking [${detection.method}]`
          );
          lastActiveSpeaker = detection.speaker;
        }
      } else {
        if (lastActiveSpeaker) {
          console.log(
            `🤐 ${lastActiveSpeaker} STOPPED speaking [no-large-video-detected]`
          );
          lastActiveSpeaker = null;
        }
      }

      // Log summary every 40 cycles (2 seconds)
      if (nodeRefreshCounter % 40 === 0) {
        const currentSpeaker = lastActiveSpeaker || "No one";
        console.log(`📈 Current Speaker: ${currentSpeaker}`);
      }
    }, 50); // Poll every 50ms
  };

  // Cleanup function
  window.stopWorkingDetection = () => {
    console.log("🛑 Stopping working detection...");
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    lastActiveSpeaker = null;
    deviceToParticipantMap.clear();
    console.log("✅ Working detection stopped");
  };

  // Start the working detection
  const start = async () => {
    console.log("🚀 Setting up WORKING speaker detection...");
    await ensurePeoplePanelOpen();
    startWorkingPolling();
    console.log("✅ Working detection is now running!");
    console.log("💡 To stop detection, run: stopWorkingDetection()");
    console.log(
      "🎯 This version uses the largest video element to detect the active speaker."
    );
  };

  start();
})();

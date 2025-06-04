// TARGETED VERSION - Paste this into your browser console while in a Google Meet
// This version looks for the ACTUAL Google Meet speaking indicators

(function () {
  console.log("🎯 Starting TARGETED Speaker Detection...");

  let participantNodes = [];
  let pollingInterval = null;
  let lastActiveSpeaker = null;

  // Look for the ACTUAL Google Meet speaking indicators
  const detectGoogleMeetSpeaking = () => {
    let activeSpeaker = null;
    let detectionMethod = "";

    // Strategy 1: Check who is in the main video area (most prominent indicator)
    const checkMainVideoSpeaker = () => {
      // Look for the main video container that shows the active speaker
      const mainVideoContainer =
        document.querySelector("[data-self-participant-id]") ||
        document.querySelector('[jscontroller="wQNmvb"]') ||
        document.querySelector(".R5ccN"); // Main video area

      if (mainVideoContainer) {
        // Get the participant ID or name from the main video
        const participantId =
          mainVideoContainer.getAttribute("data-self-participant-id") ||
          mainVideoContainer.getAttribute("data-participant-id");

        if (participantId) {
          // Find the corresponding participant in the people list
          const participant = participantNodes.find(
            (p) => p.id === participantId
          );
          if (participant) {
            return {
              speaker: participant.name,
              method: "main-video-prominent",
            };
          }
        }

        // Alternative: look for name text in main video area
        const nameElements = mainVideoContainer.querySelectorAll(
          "[data-self-name], .zWGUib"
        );
        for (const nameEl of nameElements) {
          if (nameEl.textContent?.trim()) {
            const name = nameEl.textContent.split("\n").pop()?.trim();
            const participant = participantNodes.find((p) => p.name === name);
            if (participant) {
              return { speaker: participant.name, method: "main-video-name" };
            }
          }
        }
      }
      return null;
    };

    // Strategy 2: Look for visual prominence in participant list
    const checkParticipantListHighlight = () => {
      let mostProminentParticipant = null;
      let maxProminence = 0;

      participantNodes.forEach((node) => {
        if (!node.el) return;

        const style = window.getComputedStyle(node.el);
        let prominenceScore = 0;

        // Check for yellow/colored border (like in your screenshot)
        if (
          style.border &&
          style.border !== "none" &&
          (style.border.includes("rgb(255, 193, 7)") || // Yellow
            style.border.includes("rgb(66, 165, 245)") || // Blue
            style.border.includes("rgb(76, 175, 80)"))
        ) {
          // Green
          prominenceScore += 50;
        }

        // Check for box shadow indicating active state
        if (
          style.boxShadow &&
          style.boxShadow !== "none" &&
          (style.boxShadow.includes("rgb(255, 193, 7)") ||
            style.boxShadow.includes("rgb(66, 165, 245)") ||
            style.boxShadow.includes("rgb(76, 175, 80)"))
        ) {
          prominenceScore += 40;
        }

        // Check for transform/scale changes (Google Meet sometimes scales active speakers)
        if (
          style.transform &&
          style.transform !== "none" &&
          style.transform.includes("scale") &&
          !style.transform.includes("scale(1)")
        ) {
          prominenceScore += 30;
        }

        // Check for z-index elevation
        const zIndex = parseInt(style.zIndex) || 0;
        if (zIndex > 10) {
          prominenceScore += 20;
        }

        // Check for opacity/brightness changes
        const brightness = style.filter.match(/brightness\(([^)]+)\)/);
        if (brightness && parseFloat(brightness[1]) > 1.1) {
          prominenceScore += 15;
        }

        if (prominenceScore > maxProminence) {
          maxProminence = prominenceScore;
          mostProminentParticipant = {
            speaker: node.name,
            method: `prominence-score:${prominenceScore}`,
          };
        }
      });

      return maxProminence > 20 ? mostProminentParticipant : null;
    };

    // Strategy 3: Check for speaking indicators in the video grid
    const checkVideoGridSpeaking = () => {
      // Look for participants in the video grid area
      const videoElements = document.querySelectorAll("[data-participant-id]");

      for (const videoEl of videoElements) {
        const participantId = videoEl.getAttribute("data-participant-id");
        const participant = participantNodes.find(
          (p) => p.id === participantId
        );

        if (participant) {
          const style = window.getComputedStyle(videoEl);

          // Check for active speaker highlight in video grid
          if (
            (style.border && style.border.includes("rgb")) ||
            (style.boxShadow && style.boxShadow.includes("rgb")) ||
            (style.outline && style.outline.includes("rgb"))
          ) {
            return {
              speaker: participant.name,
              method: "video-grid-highlight",
            };
          }
        }
      }
      return null;
    };

    // Try detection strategies in order of reliability
    const strategies = [
      checkMainVideoSpeaker,
      checkParticipantListHighlight,
      checkVideoGridSpeaking,
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result) {
        return result;
      }
    }

    return null;
  };

  // Helper function to get participant name
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
  const startTargetedPolling = () => {
    let nodeRefreshCounter = 0;

    pollingInterval = setInterval(async () => {
      nodeRefreshCounter++;

      // Refresh participant nodes every 50 cycles (2.5 seconds)
      if (nodeRefreshCounter % 50 === 1) {
        if (!(await ensurePeoplePanelOpen())) {
          console.log("❌ Cannot ensure people panel is open");
          return;
        }

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
      }

      // Detect active speaker using targeted strategies
      const detection = detectGoogleMeetSpeaking();

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
        // No active speaker detected
        if (lastActiveSpeaker) {
          console.log(
            `🤐 ${lastActiveSpeaker} STOPPED speaking [no-active-detected]`
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
  window.stopTargetedDetection = () => {
    console.log("🛑 Stopping targeted detection...");
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    lastActiveSpeaker = null;
    console.log("✅ Targeted detection stopped");
  };

  // Start the targeted detection
  const start = async () => {
    console.log("🚀 Setting up TARGETED speaker detection...");
    await ensurePeoplePanelOpen();
    startTargetedPolling();
    console.log("✅ Targeted detection is now running!");
    console.log("💡 To stop detection, run: stopTargetedDetection()");
    console.log(
      "🎯 This version looks for actual Google Meet speaking indicators."
    );
  };

  start();
})();

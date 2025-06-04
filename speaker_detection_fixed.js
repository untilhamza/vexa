// FIXED VERSION - Paste this into your browser console while in a Google Meet
// This version properly detects speaking by filtering out constant animations

(function () {
  console.log("🔧 Starting FIXED Speaker Detection...");

  let participantNodes = [];
  let pollingInterval = null;
  let stateHistory = new Map(); // Track animation changes over time

  // More sophisticated speaking detection
  const detectActualSpeaking = (participantEl, participantName) => {
    let isSpeaking = false;
    let detectionMethods = [];

    // Strategy 1: Look for Google Meet's actual speaking indicators
    // Based on your debug, we need to be more specific

    // Check for speaking ring/border (Google Meet highlights active speakers)
    const hasActiveBorder = () => {
      const style = window.getComputedStyle(participantEl);
      // Look for border, box-shadow, or outline changes that indicate speaking
      if (
        style.border !== "none" &&
        style.border !== "0px" &&
        (style.border.includes("rgb") || style.borderColor !== "transparent")
      ) {
        return true;
      }
      if (style.boxShadow !== "none" && style.boxShadow.includes("rgb")) {
        return true;
      }
      if (style.outline !== "none" && style.outline !== "0px") {
        return true;
      }
      return false;
    };

    if (hasActiveBorder()) {
      isSpeaking = true;
      detectionMethods.push("active-border");
    }

    // Strategy 2: Look for amplitude/volume indicators
    const volumeIndicators = participantEl.querySelectorAll(
      '[class*="volume"], [class*="amplitude"], [class*="level"], [class*="wave"]'
    );
    if (volumeIndicators.length > 0) {
      volumeIndicators.forEach((indicator) => {
        const style = window.getComputedStyle(indicator);
        // Check if the volume indicator is visible and changing
        if (
          style.opacity !== "0" &&
          style.display !== "none" &&
          (style.transform !== "none" ||
            style.width !== "0px" ||
            style.height !== "0px")
        ) {
          isSpeaking = true;
          detectionMethods.push("volume-indicator");
        }
      });
    }

    // Strategy 3: Check for microphone status changes
    const micElements = participantEl.querySelectorAll(
      '[aria-label*="microphone"], [class*="mic"], [data-tooltip*="mic"]'
    );
    micElements.forEach((micEl) => {
      const micStyle = window.getComputedStyle(micEl);
      const parentStyle = micEl.parentElement
        ? window.getComputedStyle(micEl.parentElement)
        : null;

      // Look for active microphone indicators (not muted indicators)
      if (micStyle.opacity > 0.7 && micStyle.display !== "none") {
        // Check if the mic indicator suggests active speaking (not just unmuted)
        if (
          parentStyle &&
          (parentStyle.backgroundColor !== "rgba(0, 0, 0, 0)" ||
            parentStyle.border !== "none" ||
            micStyle.color !== "rgb(128, 128, 128)")
        ) {
          // Not grayed out
          isSpeaking = true;
          detectionMethods.push("active-mic");
        }
      }
    });

    // Strategy 4: Smart animation filtering - only NEW or CHANGING animations
    const currentAnimations = new Set();
    const animatedElements = participantEl.querySelectorAll("*");

    animatedElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.animationName !== "none" && style.animationName !== "") {
        currentAnimations.add(`${el.className}-${style.animationName}`);
      }
    });

    // Compare with previous state
    const participantKey = participantName;
    const previousAnimations = stateHistory.get(participantKey) || new Set();

    // Only consider it speaking if there are NEW animations or significant changes
    const newAnimations = [...currentAnimations].filter(
      (anim) => !previousAnimations.has(anim)
    );
    const removedAnimations = [...previousAnimations].filter(
      (anim) => !currentAnimations.has(anim)
    );

    if (newAnimations.length > 0 || removedAnimations.length > 0) {
      // Only count as speaking if it's not the constant UI animations we saw in debug
      const isConstantUIAnimation = newAnimations.some(
        (anim) =>
          anim.includes("OiePBf-zPjgPe") ||
          anim.includes("VYBDae-Bz112c-UHGRz") ||
          anim.includes("VYBDae-Bz112c-RLmnJb")
      );

      if (!isConstantUIAnimation && newAnimations.length > 0) {
        isSpeaking = true;
        detectionMethods.push(`new-animation:${newAnimations[0]}`);
      }
    }

    // Update state history
    stateHistory.set(participantKey, currentAnimations);

    // Strategy 5: Check participant order (Google Meet often moves active speakers to top)
    const participantList = participantEl.closest('[role="list"]');
    if (participantList) {
      const allParticipants = Array.from(
        participantList.querySelectorAll("[data-participant-id]")
      );
      const currentIndex = allParticipants.indexOf(participantEl);

      // If this participant moved to position 0 recently, might be speaking
      if (currentIndex === 0 && allParticipants.length > 1) {
        const previousIndex =
          stateHistory.get(`${participantKey}-position`) || -1;
        if (previousIndex > 0) {
          isSpeaking = true;
          detectionMethods.push("moved-to-top");
        }
        stateHistory.set(`${participantKey}-position`, currentIndex);
      } else {
        stateHistory.set(`${participantKey}-position`, currentIndex);
      }
    }

    // Strategy 6: Visual prominence changes (brightness, scale, etc.)
    const style = window.getComputedStyle(participantEl);
    const currentBrightness = style.filter.match(/brightness\(([^)]+)\)/);
    const brightness = currentBrightness ? parseFloat(currentBrightness[1]) : 1;

    const previousBrightness =
      stateHistory.get(`${participantKey}-brightness`) || 1;
    if (Math.abs(brightness - previousBrightness) > 0.1) {
      if (brightness > previousBrightness && brightness > 1.1) {
        isSpeaking = true;
        detectionMethods.push("brightness-increase");
      }
    }
    stateHistory.set(`${participantKey}-brightness`, brightness);

    return { isSpeaking, methods: detectionMethods };
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

  // Main polling function with better logic
  const startFixedPolling = () => {
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
              lastState: false,
            });
          }
        });

        console.log(
          `✅ Monitoring ${
            participantNodes.length
          } participants: ${participantNodes.map((p) => p.name).join(", ")}`
        );
      }

      // Check each participant every cycle
      participantNodes.forEach((node) => {
        if (node && node.el) {
          const detection = detectActualSpeaking(node.el, node.name);

          if (detection.isSpeaking !== node.lastState) {
            node.lastState = detection.isSpeaking;
            console.log(
              `🔔 ${node.name} ${
                detection.isSpeaking ? "🗣️ STARTED" : "🤐 STOPPED"
              } speaking [${detection.methods.join(",")}]`
            );
          }
        }
      });

      // Log summary every 40 cycles (2 seconds)
      if (nodeRefreshCounter % 40 === 0) {
        const speakerSummary = participantNodes
          .map((p) => {
            return `${p.name}: ${p.lastState ? "🗣️" : "🤐"}`;
          })
          .join(" | ");

        if (speakerSummary) {
          console.log(`📈 Speaker Status: ${speakerSummary}`);
        }
      }
    }, 50); // Poll every 50ms
  };

  // Cleanup function
  window.stopFixedDetection = () => {
    console.log("🛑 Stopping fixed detection...");
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    stateHistory.clear();
    console.log("✅ Fixed detection stopped");
  };

  // Start the fixed detection
  const start = async () => {
    console.log("🚀 Setting up FIXED speaker detection...");
    await ensurePeoplePanelOpen();
    startFixedPolling();
    console.log("✅ Fixed detection is now running!");
    console.log("💡 To stop detection, run: stopFixedDetection()");
    console.log(
      "🎯 This version filters out constant UI animations and looks for actual speaking changes."
    );
  };

  start();
})();

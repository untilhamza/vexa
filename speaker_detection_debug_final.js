// DEBUG FINAL VERSION - Let's see why it's detecting the wrong speaker
// Paste this into your browser console while in a Google Meet

(function () {
  console.log("🐛 FINAL DEBUG: Why is detection wrong?");

  let participantNodes = [];
  let pollingInterval = null;

  // Debug each detection strategy
  const debugDetectionStrategies = () => {
    console.log("🔍 === DEBUGGING DETECTION STRATEGIES ===");

    // Strategy 1: Debug main video detection
    console.log("🎥 Strategy 1: Main Video Detection");
    const mainVideoSelectors = [
      "[data-self-participant-id]",
      '[jscontroller="wQNmvb"]',
      ".R5ccN",
      "[data-participant-id]", // All video containers
      ".KV1GEc", // Participant containers
      '[role="img"]', // Video elements
    ];

    mainVideoSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      console.log(`  ${selector}: Found ${elements.length} elements`);

      elements.forEach((el, index) => {
        const participantId =
          el.getAttribute("data-participant-id") ||
          el.getAttribute("data-self-participant-id");
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        console.log(`    Element ${index}:`, {
          participantId,
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          position: `${Math.round(rect.x)},${Math.round(rect.y)}`,
          zIndex: style.zIndex,
          border: style.border,
          boxShadow: style.boxShadow,
          transform: style.transform,
          textContent: el.textContent?.trim().slice(0, 50) || "No text",
        });
      });
    });

    // Strategy 2: Debug participant list highlights
    console.log("📋 Strategy 2: Participant List Analysis");
    participantNodes.forEach((node) => {
      if (!node.el) return;

      const style = window.getComputedStyle(node.el);
      const rect = node.el.getBoundingClientRect();

      console.log(`  ${node.name}:`, {
        border: style.border,
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
        transform: style.transform,
        zIndex: style.zIndex,
        filter: style.filter,
        size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        position: `${Math.round(rect.x)},${Math.round(rect.y)}`,
      });
    });

    // Strategy 3: Look for the actual yellow border
    console.log("🟡 Strategy 3: Yellow Border Detection");
    const allElements = document.querySelectorAll("*");
    const yellowBorderElements = [];

    allElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      // Look for yellow-ish borders/shadows
      if (
        style.border.includes("rgb(255, 193, 7)") ||
        style.border.includes("rgb(255, 235, 59)") ||
        style.border.includes("#ffc107") ||
        style.border.includes("yellow") ||
        style.boxShadow.includes("rgb(255, 193, 7)") ||
        style.boxShadow.includes("rgb(255, 235, 59)") ||
        style.outline.includes("rgb(255, 193, 7)")
      ) {
        yellowBorderElements.push({
          element: el,
          tagName: el.tagName,
          classes: Array.from(el.classList).join(" "),
          border: style.border,
          boxShadow: style.boxShadow,
          outline: style.outline,
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          text: el.textContent?.trim().slice(0, 30) || "No text",
        });
      }
    });

    console.log("  Yellow border elements found:", yellowBorderElements);

    // Strategy 4: Find the largest video element
    console.log("📺 Strategy 4: Largest Video Element");
    const videoContainers = document.querySelectorAll(
      '[data-participant-id], video, [class*="video"]'
    );
    let largestVideo = null;
    let maxArea = 0;

    videoContainers.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;

      if (area > maxArea) {
        maxArea = area;
        largestVideo = {
          element: el,
          participantId: el.getAttribute("data-participant-id"),
          area: Math.round(area),
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          classes: Array.from(el.classList).join(" "),
        };
      }
    });

    console.log("  Largest video element:", largestVideo);

    // Strategy 5: Find who's actually shown at the bottom (like Hamza in screenshot)
    console.log("⬇️ Strategy 5: Bottom Video Elements (Active Speaker Area)");
    const bottomElements = document.querySelectorAll("[data-participant-id]");
    const bottomVideos = [];

    bottomElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Look for elements in the bottom area of the screen
      if (rect.bottom > window.innerHeight - 200) {
        // Bottom 200px
        const participantId = el.getAttribute("data-participant-id");
        const participant = participantNodes.find(
          (p) => p.id === participantId
        );

        bottomVideos.push({
          name: participant?.name || "Unknown",
          participantId,
          position: `${Math.round(rect.x)},${Math.round(rect.y)}`,
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          classes: Array.from(el.classList).join(" "),
        });
      }
    });

    console.log("  Bottom video elements:", bottomVideos);

    console.log("🔍 === END DEBUG ===");
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

  // Main debug polling function
  const startDebugPolling = () => {
    let debugCounter = 0;

    pollingInterval = setInterval(async () => {
      debugCounter++;

      // Refresh participant nodes every 20 cycles
      if (debugCounter % 20 === 1) {
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

      // Run debug every 40 cycles (2 seconds)
      if (debugCounter % 40 === 0 && debugCounter <= 120) {
        debugDetectionStrategies();
      }

      // Stop after a few cycles
      if (debugCounter >= 120) {
        console.log("🛑 Debug completed");
        clearInterval(pollingInterval);
      }
    }, 50);
  };

  // Cleanup function
  window.stopFinalDebug = () => {
    console.log("🛑 Stopping final debug...");
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    console.log("✅ Final debug stopped");
  };

  // Start the debug
  const start = async () => {
    console.log("🚀 Setting up FINAL debug...");
    await ensurePeoplePanelOpen();
    startDebugPolling();
    console.log("✅ Final debug is now running!");
    console.log("💡 To stop debug, run: stopFinalDebug()");
  };

  start();
})();

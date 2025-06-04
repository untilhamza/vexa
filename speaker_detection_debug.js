// DEBUG VERSION - Paste this into your browser console while in a Google Meet
// This will help us understand why speaker detection isn't working properly

(function () {
  console.log("🐛 Starting Speaker Detection DEBUG...");

  let participantNodes = [];
  let debugCounter = 0;
  let pollingInterval = null;

  // Enhanced debugging detection function
  const debugDetectSpeaking = (participantEl, participantName) => {
    let isSpeaking = false;
    let detectionMethods = [];
    let debugInfo = {
      classes: Array.from(participantEl.classList),
      allChildClasses: [],
      attributes: {},
      styles: {},
      visualElements: [],
    };

    // Collect ALL classes from participant and children
    const allElements = participantEl.querySelectorAll("*");
    allElements.forEach((el) => {
      if (el.classList.length > 0) {
        debugInfo.allChildClasses.push(...Array.from(el.classList));
      }
    });

    // Remove duplicates
    debugInfo.allChildClasses = [...new Set(debugInfo.allChildClasses)];

    // Collect all attributes
    for (let attr of participantEl.attributes) {
      debugInfo.attributes[attr.name] = attr.value;
    }

    // Check for speaking indicators
    const speakingClasses = [
      "HX2H7",
      "gZuAFe",
      "L5Lhkd",
      "SfqTBc",
      "speaking",
      "voice-active",
      "mic-active",
      "audio-indicator",
      "voice-indicator",
      "is-speaking",
      "participant-speaking",
      "user-speaking",
      "active-speaker",
    ];

    for (const className of speakingClasses) {
      if (
        participantEl.classList.contains(className) ||
        participantEl.querySelector(`.${className}`)
      ) {
        isSpeaking = true;
        detectionMethods.push(`class:${className}`);
      }
    }

    // Look for any element that might indicate speaking
    const potentialSpeakingElements = participantEl.querySelectorAll("*");
    potentialSpeakingElements.forEach((el) => {
      const classes = Array.from(el.classList).join(" ");
      const style = window.getComputedStyle(el);

      // Look for elements with animation, transform, or color changes
      if (style.animationName !== "none" && style.animationName !== "") {
        debugInfo.visualElements.push(`ANIMATED: ${el.tagName}.${classes}`);
        if (!isSpeaking) {
          isSpeaking = true;
          detectionMethods.push(`animation:${el.tagName}`);
        }
      }

      if (
        style.transform !== "none" &&
        style.transform !== "matrix(1, 0, 0, 1, 0, 0)"
      ) {
        debugInfo.visualElements.push(`TRANSFORMED: ${el.tagName}.${classes}`);
      }

      if (style.opacity !== "1" && style.opacity !== "0") {
        debugInfo.visualElements.push(
          `OPACITY: ${el.tagName}.${classes} (${style.opacity})`
        );
      }
    });

    return { isSpeaking, methods: detectionMethods, debug: debugInfo };
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
      // Try alternative selectors
      const altSelectors = [
        'button[aria-label="People"]',
        'button[data-panel-id="1"]',
        'button[aria-label*="People"]',
        '[role="button"][aria-label*="People"]',
      ];

      for (const selector of altSelectors) {
        const altButton = document.querySelector(selector);
        if (altButton) {
          console.log(`✅ Found people button with: ${selector}`);
          altButton.click();
          await new Promise((r) => setTimeout(r, 1500));
          return true;
        }
      }
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
    pollingInterval = setInterval(async () => {
      debugCounter++;

      // Refresh participant nodes every 10 cycles for debug
      if (debugCounter % 10 === 1) {
        if (!(await ensurePeoplePanelOpen())) {
          console.log("❌ Cannot ensure people panel is open");
          return;
        }

        participantNodes = [];

        // Try multiple selectors for participant elements
        const participantSelectors = [
          'div[role="listitem"][data-participant-id]',
          "[data-participant-id]",
          'div[role="listitem"]',
          ".participant-item",
          "[data-self-name]",
        ];

        let participantElements = [];
        for (const selector of participantSelectors) {
          participantElements = Array.from(document.querySelectorAll(selector));
          if (participantElements.length > 0) {
            console.log(
              `🔍 Found ${participantElements.length} participants using: ${selector}`
            );
            break;
          }
        }

        if (participantElements.length === 0) {
          console.log("❌ No participant elements found with any selector");
          console.log("🔍 Available elements in people panel:");
          const peoplePanel =
            document.querySelector('[role="list"]') ||
            document.querySelector('[aria-label*="Participants"]');
          if (peoplePanel) {
            const allElements = peoplePanel.querySelectorAll("*");
            const elementInfo = Array.from(allElements)
              .slice(0, 10)
              .map((el) => {
                const classes = Array.from(el.classList).join(".");
                const id = el.id ? `#${el.id}` : "";
                const dataAttrs = Array.from(el.attributes)
                  .filter((attr) => attr.name.startsWith("data-"))
                  .map((attr) => `[${attr.name}="${attr.value}"]`)
                  .join("");
                return `${el.tagName}${id}${
                  classes ? "." + classes : ""
                }${dataAttrs}`;
              })
              .join("\n  ");
            console.log(`  ${elementInfo}`);
          }
          return;
        }

        participantElements.forEach((el) => {
          const participantId =
            el.getAttribute("data-participant-id") ||
            `unknown-${Math.random().toString(36).substr(2, 9)}`;
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

      // Debug each participant
      if (debugCounter % 5 === 0) {
        // Every 250ms
        participantNodes.forEach((node) => {
          if (node && node.el) {
            const detection = debugDetectSpeaking(node.el, node.name);

            // Log detailed debug info for first few cycles
            if (debugCounter <= 50) {
              console.log(`🐛 DEBUG ${node.name}:`);
              console.log(`  Speaking: ${detection.isSpeaking}`);
              console.log(`  Methods: [${detection.methods.join(", ")}]`);
              console.log(
                `  Participant Classes: [${detection.debug.classes.join(", ")}]`
              );
              console.log(
                `  All Child Classes: [${detection.debug.allChildClasses
                  .slice(0, 10)
                  .join(", ")}...]`
              );
              console.log(`  Attributes:`, detection.debug.attributes);
              console.log(
                `  Visual Elements:`,
                detection.debug.visualElements.slice(0, 5)
              );
              console.log("---");
            }

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
      }

      // Stop after 100 cycles to avoid spam
      if (debugCounter >= 100) {
        console.log("🛑 Debug completed after 100 cycles");
        clearInterval(pollingInterval);

        // Final summary
        console.log("📊 FINAL DEBUG SUMMARY:");
        participantNodes.forEach((node) => {
          const detection = debugDetectSpeaking(node.el, node.name);
          console.log(
            `${node.name}: Currently ${
              detection.isSpeaking ? "Speaking" : "Silent"
            }`
          );
        });
      }
    }, 50); // Poll every 50ms
  };

  // Cleanup function
  window.stopDebugDetection = () => {
    console.log("🛑 Stopping debug detection...");
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    console.log("✅ Debug detection stopped");
  };

  // Start the debug
  const start = async () => {
    console.log("🚀 Setting up debug speaker detection...");
    startDebugPolling();
    console.log(
      "✅ Debug detection is now running! Will auto-stop after 100 cycles."
    );
    console.log("💡 To stop early, run: stopDebugDetection()");
  };

  start();
})();

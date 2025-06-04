// Paste this into your browser console while in a Google Meet
// This will detect and log speaker activity in real-time

(function () {
  console.log("🎤 Starting Speaker Detection Test...");

  let participantNodes = [];
  let realtimeSpeakingStates = new Map();
  let mutationObserver = null;
  let pollingInterval = null;
  let continuousScanner = null;

  // Multi-strategy speaking detection
  const detectSpeakingForElement = (participantEl) => {
    let isSpeaking = false;
    let detectionMethods = [];

    // Strategy 1: CSS class detection
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
        break;
      }
    }

    // Strategy 2: Visual speaking indicators
    if (!isSpeaking) {
      const visualIndicators = [
        "svg[data-speaking]",
        'div[data-speaking="true"]',
        ".voice-visualization",
        ".audio-wave",
        ".speaking-animation",
        '[aria-label*="speaking"]',
        '[aria-label*="voice"]',
        ".mic-indicator.active",
        ".voice-level",
      ];

      for (const selector of visualIndicators) {
        if (participantEl.querySelector(selector)) {
          isSpeaking = true;
          detectionMethods.push(`visual:${selector}`);
          break;
        }
      }
    }

    // Strategy 3: Style-based detection
    if (!isSpeaking) {
      const micElements = participantEl.querySelectorAll(
        '[class*="mic"], [class*="audio"], [class*="voice"]'
      );

      micElements.forEach((micEl) => {
        const micStyle = window.getComputedStyle(micEl);
        if (
          micStyle.opacity !== "0" &&
          micStyle.opacity !== "0.5" &&
          (micStyle.transform !== "none" ||
            micStyle.backgroundColor !== "rgba(0, 0, 0, 0)")
        ) {
          isSpeaking = true;
          detectionMethods.push("style:mic-active");
        }
      });
    }

    // Strategy 4: Attribute-based detection
    if (!isSpeaking) {
      const speakingAttributes = [
        "data-speaking",
        "data-voice-active",
        "data-audio-active",
      ];
      for (const attr of speakingAttributes) {
        if (
          participantEl.getAttribute(attr) === "true" ||
          participantEl.querySelector(`[${attr}="true"]`)
        ) {
          isSpeaking = true;
          detectionMethods.push(`attr:${attr}`);
          break;
        }
      }
    }

    // Strategy 5: Brightness detection
    if (!isSpeaking) {
      const style = window.getComputedStyle(participantEl);
      const brightnessMatch = style.filter.match(/brightness\(([^)]+)\)/);
      const brightness = brightnessMatch ? parseFloat(brightnessMatch[1]) : 1;
      if (brightness > 1.2) {
        isSpeaking = true;
        detectionMethods.push("brightness");
      }
    }

    // Strategy 6: Animation detection
    if (!isSpeaking) {
      const animatedElements = participantEl.querySelectorAll("*");
      animatedElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.animationName !== "none" && style.animationName !== "") {
          isSpeaking = true;
          detectionMethods.push("animation");
        }
      });
    }

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

  // Setup real-time mutation observer
  const setupMutationObserver = () => {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" || mutation.type === "childList") {
          const target = mutation.target;
          if (
            target &&
            (target.closest("[data-participant-id]") ||
              target.matches("[data-participant-id]"))
          ) {
            const participantEl =
              target.closest("[data-participant-id]") || target;
            const participantId = participantEl.getAttribute(
              "data-participant-id"
            );

            if (participantId) {
              const detection = detectSpeakingForElement(participantEl);
              const previousState =
                realtimeSpeakingStates.get(participantId) || false;

              if (detection.isSpeaking !== previousState) {
                realtimeSpeakingStates.set(participantId, detection.isSpeaking);
                const participantName = getParticipantName(participantEl);
                console.log(
                  `🔄 ${participantName} ${
                    detection.isSpeaking ? "🗣️ STARTED" : "🤐 STOPPED"
                  } speaking (mutation) [${detection.methods.join(",")}]`
                );
              }
            }
          }
        }
      });
    });

    const participantsArea =
      document.querySelector('[role="list"]') || document.body;
    mutationObserver.observe(participantsArea, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class", "style", "data-speaking", "aria-label"],
    });
  };

  // Continuous scanner for ultra-responsive detection
  const startContinuousScanning = () => {
    continuousScanner = setInterval(() => {
      const allParticipants = document.querySelectorAll(
        "[data-participant-id]"
      );
      allParticipants.forEach((participantEl) => {
        const participantId = participantEl.getAttribute("data-participant-id");
        if (participantId) {
          const detection = detectSpeakingForElement(participantEl);
          const previousState =
            realtimeSpeakingStates.get(participantId) || false;

          if (detection.isSpeaking !== previousState) {
            realtimeSpeakingStates.set(participantId, detection.isSpeaking);
            const participantName = getParticipantName(participantEl);
            console.log(
              `⚡ ${participantName} ${
                detection.isSpeaking ? "🗣️ STARTED" : "🤐 STOPPED"
              } speaking (scan) [${detection.methods.join(",")}]`
            );
          }
        }
      });
    }, 100); // Scan every 100ms
  };

  // Main polling function
  const startPolling = () => {
    let nodeRefreshCounter = 0;

    pollingInterval = setInterval(async () => {
      nodeRefreshCounter++;

      // Refresh participant nodes every 25 cycles (1.25 seconds)
      if (nodeRefreshCounter % 25 === 1) {
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
              lastState: realtimeSpeakingStates.get(participantId) || false,
            });
          }
        });

        console.log(
          `✅ Monitoring ${
            participantNodes.length
          } participants: ${participantNodes.map((p) => p.name).join(", ")}`
        );
        setupMutationObserver();
      }

      // Check each participant
      participantNodes.forEach((node) => {
        if (node && node.el) {
          const detection = detectSpeakingForElement(node.el);
          const realtimeState = realtimeSpeakingStates.get(node.id) || false;
          const finalSpeakingState = detection.isSpeaking || realtimeState;

          if (finalSpeakingState !== node.lastState) {
            node.lastState = finalSpeakingState;
            realtimeSpeakingStates.set(node.id, finalSpeakingState);
            console.log(
              `📊 ${node.name} ${
                finalSpeakingState ? "🗣️ STARTED" : "🤐 STOPPED"
              } speaking (poll) [${detection.methods.join(",")}]`
            );
          }
        }
      });

      // Log summary every 20 cycles (1 second)
      if (nodeRefreshCounter % 20 === 0) {
        const speakerSummary = participantNodes
          .map((p) => {
            const isActive = realtimeSpeakingStates.get(p.id) || false;
            return `${p.name}: ${isActive ? "🗣️" : "🤐"}`;
          })
          .join(" | ");

        if (speakerSummary) {
          console.log(`📈 Speaker Status: ${speakerSummary}`);
        }
      }
    }, 50); // Poll every 50ms
  };

  // Start everything
  const start = async () => {
    console.log("🚀 Setting up speaker detection...");
    await ensurePeoplePanelOpen();
    setupMutationObserver();
    startContinuousScanning();
    startPolling();
    console.log(
      "✅ Speaker detection is now running! Check console for real-time updates."
    );
  };

  // Cleanup function
  window.stopSpeakerDetection = () => {
    console.log("🛑 Stopping speaker detection...");
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (continuousScanner) {
      clearInterval(continuousScanner);
      continuousScanner = null;
    }
    console.log("✅ Speaker detection stopped");
  };

  // Start the detection
  start();

  console.log("💡 To stop detection, run: stopSpeakerDetection()");
})();

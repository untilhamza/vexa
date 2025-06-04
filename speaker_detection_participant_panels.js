// PARTICIPANT PANEL BASED SPEAKER DETECTION
// Paste this into your browser console while in a Google Meet

(function () {
  console.log("🎯 Starting PARTICIPANT PANEL Speaker Detection...");

  let pollingInterval = null;
  let lastActiveSpeaker = null;
  let participantNodes = [];

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

  // Detect if a participant is speaking based on panel indicators
  const detectSpeakingFromPanel = (participantEl) => {
    const participantName = getParticipantName(participantEl);

    // Method 1: Check for self (you) speaking indicator
    // When you're speaking: class="jb1oQc yDdjGe"
    // When you're not: class="jb1oQc FTMc0c"
    const selfMicIndicator = participantEl.querySelector(".jb1oQc.yDdjGe");
    if (selfMicIndicator) {
      return {
        speaker: participantName,
        method: "self-mic-indicator-yDdjGe",
        isSelf: true,
      };
    }

    // Method 2: Check for other participants speaking indicator
    // When others are speaking: button is enabled and aria-label="Mute [Name]'s microphone"
    // When others are not: button is disabled and aria-label="You can't unmute someone else"
    const muteButtons = participantEl.querySelectorAll(
      'button[aria-label*="microphone"]'
    );
    for (const button of muteButtons) {
      const ariaLabel = button.getAttribute("aria-label") || "";
      const isDisabled = button.hasAttribute("disabled");

      // If button is enabled and says "Mute [Name]'s microphone", they're speaking
      if (
        !isDisabled &&
        ariaLabel.includes("Mute") &&
        ariaLabel.includes("microphone") &&
        !ariaLabel.includes("can't unmute")
      ) {
        return {
          speaker: participantName,
          method: "other-mic-button-enabled",
          isSelf: false,
          ariaLabel: ariaLabel,
        };
      }
    }

    return null;
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

  // Main detection function
  const detectActiveSpeaker = () => {
    const participantElements = Array.from(
      document.querySelectorAll('div[role="listitem"][data-participant-id]')
    );

    console.log(
      `🔍 Checking ${participantElements.length} participants for speaking indicators...`
    );

    for (const participantEl of participantElements) {
      const detection = detectSpeakingFromPanel(participantEl);
      if (detection) {
        return detection;
      }
    }

    return null;
  };

  // Main polling function
  const startParticipantPanelPolling = () => {
    let nodeRefreshCounter = 0;

    pollingInterval = setInterval(async () => {
      nodeRefreshCounter++;

      // Refresh participant nodes every 100 cycles
      if (nodeRefreshCounter % 100 === 1) {
        if (!(await ensurePeoplePanelOpen())) {
          console.log("❌ Cannot ensure people panel is open");
          return;
        }

        // Refresh participant list
        participantNodes = [];
        const participantElements = Array.from(
          document.querySelectorAll('div[role="listitem"][data-participant-id]')
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

      // Detect active speaker
      const detection = detectActiveSpeaker();

      if (detection) {
        if (detection.speaker !== lastActiveSpeaker) {
          if (lastActiveSpeaker) {
            console.log(`🤐 ${lastActiveSpeaker} STOPPED speaking`);
          }
          console.log(
            `🗣️ ${detection.speaker} STARTED speaking [${detection.method}${
              detection.isSelf ? " - SELF" : " - OTHER"
            }]`
          );
          if (detection.ariaLabel) {
            console.log(`   📝 Button aria-label: "${detection.ariaLabel}"`);
          }
          lastActiveSpeaker = detection.speaker;
        }
      } else {
        if (lastActiveSpeaker) {
          console.log(
            `🤐 ${lastActiveSpeaker} STOPPED speaking [no-panel-indicators-detected]`
          );
          lastActiveSpeaker = null;
        }
      }

      // Log summary every 80 cycles (4 seconds)
      if (nodeRefreshCounter % 80 === 0) {
        const currentSpeaker = lastActiveSpeaker || "No one";
        console.log(`📈 Current Speaker: ${currentSpeaker}`);
      }
    }, 50); // Poll every 50ms
  };

  // Cleanup function
  window.stopParticipantPanelDetection = () => {
    console.log("🛑 Stopping participant panel detection...");
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    lastActiveSpeaker = null;
    console.log("✅ Participant panel detection stopped");
  };

  // Start the detection
  const start = async () => {
    console.log("🚀 Setting up PARTICIPANT PANEL speaker detection...");
    await ensurePeoplePanelOpen();
    startParticipantPanelPolling();
    console.log("✅ Participant panel detection is now running!");
    console.log("💡 To stop detection, run: stopParticipantPanelDetection()");
    console.log(
      "🎯 This version detects speaking by analyzing participant panel indicators:"
    );
    console.log("   • For self: yDdjGe class indicates speaking");
    console.log("   • For others: enabled mute button indicates speaking");
  };

  start();
})();

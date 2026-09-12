if (!coordinates) {
    console.log("No coordinates available for this listing.");
} else {

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {

        const map = L.map("map").setView(
            [latitude, longitude],
            13
        );

        L.tileLayer(
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap contributors"
            }
        ).addTo(map);

        L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup("Here it is!")
            .openPopup();

        setTimeout(() => {
            map.invalidateSize();
        }, 500);

    } else {
        console.log("Invalid coordinates:", coordinates);
    }
}
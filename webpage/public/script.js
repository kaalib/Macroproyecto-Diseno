async function fetchLocationData() {
    try {
        const response = await fetch('/data');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        document.getElementById('latitude').textContent = data.latitude || 'N/A';
        document.getElementById('longitude').textContent = data.longitude || 'N/A';
        const localDateTime = new Date(data.timestamp)
        document.getElementById('timestamp').textContent = localDateTime.toDateString('en-GB') || 'N/A';
    } catch (error) {
        console.error('Error fetching location data:', error);
    }
}

fetchLocationData();
setInterval(fetchLocationData, 1000); // Refresh data every second
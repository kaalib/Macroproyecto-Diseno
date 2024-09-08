function fetchLatestLocation() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            document.getElementById('latitude').innerText = data.latitude;
            document.getElementById('longitude').innerText = data.longitude;
            const timestamp = convertToLocalTime(data.timestamp);
            const date = timestamp.split(', ')[0];
            const time = timestamp.split(', ')[1];
            document.getElementById('date').innerText = date;
            document.getElementById('time').innerText = time;
        })
        .catch(err => console.error('Error fetching latest location:', err));
}

function convertToLocalTime(utcDateString) {
    const localDate = new Date(utcDateString); 
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'America/Bogota'
    };   
    return localDate.toLocaleString('en-GB', options);
}

setInterval(fetchLatestLocation, 1000);

fetchLatestLocation();
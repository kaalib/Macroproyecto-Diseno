let map;
let marker;
let polyline;
let path = [];
let lastTimestamp = []

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 14
    });
    
    marker = new google.maps.Marker({
        position: { lat: 0, lng: 0 },
        map: map
    });

    polyline = new google.maps.Polyline({
        path: path,
        strokeColor: '#6F2F9E',
        strokeOpacity: 1.0,
        strokeWeight: 5,
        geodesic: true,
        map: map
    });
}

function loadMap() {
    fetch('/api_key')
        .then(response => response.json())
        .then(data => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&callback=initMap`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        })
        .catch(err => console.error('Error fetching API key:', err));
}


function checkDates(dateStart, dateEnd) {
    let start = new Date(dateStart);
    let end = new Date(dateEnd);
    return start < end;
}

function convertToGlobalTime(localTime) {
    const utcDate = new Date(localTime);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    };
    return utcDate.toLocaleDateString('en-GB', options);
}

function formatDateTime(dateTime) {
    const [date, time] = dateTime.split(', ');
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day} ${time}`;
}



function getHistoricalData(startDate, endDate) {
    const correctDates = checkDates(startDate, endDate); //check if start date is earlier than end date
    if (startDate && endDate && correctDates) {
        startDate = convertToGlobalTime(startDate); //Convert date to UTC time zone
        endDate = convertToGlobalTime(endDate); //Convert date to UTC time zone

        date1 = formatDateTime(startDate); // Convert the dates to the desired format YYYY/MM/DD HH:MM:SS
        date2 = formatDateTime(endDate); // Convert the dates to the desired format YYYY/MM/DD HH:MM:SS

        // Construct the URL with encoded date parameters for fetching historical data
        const url = `/historics?starDate=${encodeURIComponent(date1)}&endDate=${encodeURIComponent(date2)}`;

        console.log("Encoded URL:", url);  
        fetch(url) 
            .then(response => response.json())
            .then(data => {
                console.log('Data fetched:', data);
                console.log(data.length);
                if (data.length == 0){
                    alert("no routes found")
                } else{// Process the received data 
                    data.forEach(data => { //execute for every object in JSON
                        RouteHistorics(data.Latitude, data.Longitude, data.Timestamp);
    
                    
                    });}
                
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    } else {
        alert("Ensure dates are provided and the start date is earlier than the end date.");
    }
}


function RouteHistorics(lat, lng, timestamp) {
    const newPosition = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const newTimestamp = new Date(timestamp);
    
    // Always update HTML display and marker position
    marker.position = newPosition;
    map.panTo(newPosition);
    
    if (path.length === 0) {
        path.push(newPosition);
        lastTimestamp = newTimestamp;
    } else {
        const lastPosition = path[path.length - 1];
        path.push(newPosition);
        drawPolylineHistorics(lastPosition, newPosition);
        lastTimestamp = newTimestamp;
    }
}

function displayHistoricalData(data) {
    path = [];

    data.forEach(location => {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        const timestamp = new Date(location.timestamp);
        
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(timestamp.getTime())) {
            path.push({ 
                lat, 
                lng, 
                timestamp: timestamp.toLocaleString() // Convert to local time string
            });
        } else {
            console.warn('Invalid data point:', location);
        }
    });

    polyline.setPath(path);

    if (path.length > 0) {
        map.setCenter(path[0]);
        marker.setPosition(path[0]);
        
        // Add info window to the marker
        const infoWindow = new google.maps.InfoWindow({
            content: `Última posición: ${path[0].timestamp}`
        });
        infoWindow.open(map, marker);
    }

    if (path.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
    }

    console.log('Ruta actualizada en el mapa');
}   

document.getElementById('obtenerHistoricos').addEventListener('click', () => {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    getHistoricalData(startDate, endDate);
});

document.addEventListener('DOMContentLoaded', loadMap);











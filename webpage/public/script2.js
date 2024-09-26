let map;
let marker;
let polylines = [];
let routeCoordinates = [];
let lastTimestamp = null;
let live;

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


function loadMap() {
    fetch('/api-key')
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

flatpickr("#start-date", {
    dateFormat: "Y-m-d H:i",
    maxDate: new Date(),
    enableTime: true,
    onClose: function(selectedDates, dateStr, instance) {
        date1 = dateStr;
        console.log(date1)
    }
});
flatpickr("#end-date", {
    dateFormat: "Y-m-d H:i",
    maxDate: new Date(),
    enableTime: true,
    onClose: function(selectedDates, dateStr, instance) {
        date2 = dateStr;
        console.log(date2)
    }
});

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const initialPosition = { lat: 0, lng: 0 };

    map = new Map(document.getElementById("map"), {
        zoom: 14,
        center: initialPosition,
        mapId: "DEMO_MAP_ID",
    });

    marker = new AdvancedMarkerElement({
        map: map,
        position: initialPosition,
        title: "Current Location",
    });
}

function roundCoordinate(coord) {
    return Number(coord.toFixed(4));
}

function isSameLocation(coord1, coord2) {
    return roundCoordinate(coord1.lat) === roundCoordinate(coord2.lat) &&
           roundCoordinate(coord1.lng) === roundCoordinate(coord2.lng);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // distance in kilometers
    return distance;
}

function updateMapAndRouteHistorics(lat, lng, timestamp) {
    const newPosition = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const newTimestamp = new Date(timestamp);
    
    // Always update HTML display and marker position
    marker.position = newPosition;
    map.panTo(newPosition);
    
    if (routeCoordinates.length === 0) {
        routeCoordinates.push(newPosition);
        lastTimestamp = newTimestamp;
    } else {
        const lastPosition = routeCoordinates[routeCoordinates.length - 1];
        const distance = calculateDistance(lastPosition.lat, lastPosition.lng, newPosition.lat, newPosition.lng);
        const timeDiff = (newTimestamp - lastTimestamp) / (1000 * 60); // time difference in minutes
        
        if (!isSameLocation(newPosition, lastPosition) && distance <= 1 && timeDiff < 1) {
            routeCoordinates.push(newPosition);
            drawPolylineHistorics(lastPosition, newPosition);
        } else if (distance > 1 || timeDiff >= 1) {
            // If distance is greater than 1 kilometer or the time difference is greater (or equal) than 1 minute, 
            // Start a new route from that point
            routeCoordinates = [newPosition];
        }

        lastTimestamp = newTimestamp;
    }
}

function drawPolyline(origin, destination) {
    const path = [
        new google.maps.LatLng(origin.lat, origin.lng),
        new google.maps.LatLng(destination.lat, destination.lng)
    ];

    const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: colors[colorIndex],
        strokeOpacity: 1.0,
        strokeWeight: 4
    });

    polyline.setMap(map);
    polylines.push(polyline);
    console.log("Polyline drawn successfully");
}

function drawPolylineHistorics(origin, destination) {
    const path = [
        new google.maps.LatLng(origin.lat, origin.lng),
        new google.maps.LatLng(destination.lat, destination.lng)
    ];

    const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#3498db',
        strokeOpacity: 0.8,
        strokeWeight: 3
    });

    polyline.setMap(map);
    polylines.push(polyline);
    console.log("Polyline drawn successfully");
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

function checkDates(dateStart, dateEnd) {
    let start = new Date(dateStart);
    let end = new Date(dateEnd);
    return start < end;
}

function clearMap() {
    polylines.forEach(polyline => polyline.setMap(null));
    polylines = [];
    routeCoordinates = [];
    lastTimestamp = null;
    colorIndex = 0;
}

document.getElementById('obtenerHistoricos').addEventListener('click', () => {

    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;

    const correctDates = checkDates(startDate, endDate); //check if start date is earlier than end date
    if (startDate && endDate && correctDates) {
        startDate = convertToGlobalTime(startDate); //Convert date to UTC time zone
        endDate = convertToGlobalTime(endDate); //Convert date to UTC time zone

        date1 = formatDateTime(startDate); // Convert the dates to the desired format YYYY/MM/DD HH:MM:SS
        date2 = formatDateTime(endDate); // Convert the dates to the desired format YYYY/MM/DD HH:MM:SS

        // Clear the map before fetching new data
        clearMap();

        // Construct the URL with encoded date parameters for fetching historical data
        const url = `/historics?starDate=${encodeURIComponent(date1)}&endDate=${encodeURIComponent(date2)}`;

        console.log("Encoded URL:", url);  
        fetch(url) 
            .then(response => response.json())
            .then(data => {
                console.log('Data fetched:', data); //for debugging reasons
                console.log(data.length);
                if (data.length == 0){
                    alert("no routes found")
                } else{// Process the received data 
                    data.forEach(data => { //execute for every object in JSON
                        updateMapAndRouteHistorics(data.Latitude, data.Longitude, data.Timestamp);
                    });}
                
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    } else {
        alert("Ensure dates are provided and the start date is earlier than the end date.");
    }
});

document.addEventListener('DOMContentLoaded', loadMap);
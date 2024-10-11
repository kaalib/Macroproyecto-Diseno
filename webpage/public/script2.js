let map;
let marker;
let polylines = [];
let routeCoordinates = [];
let lastTimestamp = null;
let infoWindows = [];
let markers = [];

function loadMap() {
    fetch('/api_key')
        .then(response => response.json())
        .then(data => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&callback=initMap&libraries=places`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        })
        .catch(err => console.error('Error fetching API key:', err));
}

flatpickr("#startDate", {
    dateFormat: "Y-m-d H:i",
    enableTime: true,
    time_24hr: true,
    maxDate: new Date(),
    onClose: function(dateStr) {
        console.log("Fecha de inicio seleccionada:", dateStr);
    }
});

flatpickr("#endDate", {
    dateFormat: "Y-m-d H:i",
    enableTime: true,
    time_24hr: true,
    maxDate: new Date(),
    onClose: function(dateStr) {
        console.log("Fecha de fin seleccionada:", dateStr);
    }
});

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const initialPosition = { lat: 0, lng: 0 };

    map = new Map(document.getElementById("map"), {
        zoom: 14,
        center: initialPosition,
        mapId: "DEMO_MAP_ID"
    });

    marker = new AdvancedMarkerElement({
        map: map,
        position: initialPosition,
        title: "Current Location"
    });

    initAutocomplete();
}

function initAutocomplete() {
    const input = document.getElementById('address');
    
    const options = {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'CO' }
    };

    const autocomplete = new google.maps.places.Autocomplete(input, options);

    // Listener para el evento de autocompletado
    autocomplete.addListener('place_changed', function () {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            console.error("No se pudo encontrar la ubicación");
            return;
        }
        console.log("Sugerencia seleccionada:", place.formatted_address);
    });
}

function isSameLocation(coord1, coord2) {
    return Math.round(coord1.lat * 10000) === Math.round(coord2.lat * 10000) &&
           Math.round(coord1.lng * 10000) === Math.round(coord2.lng * 10000);
}

function updateMapAndRouteHistorics(lat, lng, timestamp) {
    console.log(lat, lng);
    const newPosition = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const newTimestamp = new Date(timestamp);

    marker.position = newPosition;
    map.panTo(newPosition);

    if (routeCoordinates.length === 0) {
        routeCoordinates.push(newPosition);
        lastTimestamp = newTimestamp;
    } else {
        const lastPosition = routeCoordinates[routeCoordinates.length - 1];
        const timeDiff = (newTimestamp - lastTimestamp) / (1000 * 60);

        if (!isSameLocation(newPosition, lastPosition) && timeDiff < 1) {
            routeCoordinates.push(newPosition);
            drawPolylineHistorics(lastPosition, newPosition, lastTimestamp);
        } else if (timeDiff >= 1) {
            routeCoordinates = [newPosition];
        }

        lastTimestamp = newTimestamp;
    }
}

function drawPolylineHistorics(origin, destination, timestamp) {
    const path = [
        new google.maps.LatLng(origin.lat, origin.lng),
        new google.maps.LatLng(destination.lat, destination.lng)
    ];

    const startMarker = new google.maps.Marker({
        position: origin,
        map: map,
        title: "Inicio",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#6F2F9E',
            fillOpacity: 1,
            strokeWeight: 2
        }
    });

    markers.push(startMarker);

    // Ajusta la fecha y hora según la zona horaria antes de usarla
    const adjustedTimestamp = adjustForTimezone(timestamp);
    
    const infoWindow = new google.maps.InfoWindow({
        content: `<div><strong>Registered Date</strong><br> ${adjustedTimestamp}</div>`, 
        maxWidth: 200 
    });

    infoWindows.push(infoWindow);

    startMarker.addListener('click', function() {
        infoWindow.open(map, startMarker);
    });

    const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#6F2F9E',
        strokeOpacity: 1.0,
        strokeWeight: 5
    });

    polyline.setMap(map);
    polylines.push(polyline);
    console.log("Polyline drawn successfully");
}
function adjustForTimezone(dateTime) {
    const date = new Date(dateTime);
    const adjustedDate = new Date(date.getTime() + (5 * 60 * 60 * 1000)); 

    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    return adjustedDate.toLocaleString('en-GB', options); 
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
    // Cerrar todas las InfoWindows
    infoWindows.forEach(infoWindow => infoWindow.close());
    infoWindows = []; // Limpiar el array de InfoWindows
    
    // Eliminar todos los marcadores
    markers.forEach(marker => marker.setMap(null));
    markers = []; // Limpiar el array de marcadores

    // Eliminar todas las polilíneas
    polylines.forEach(polyline => polyline.setMap(null));
    polylines = [];
    routeCoordinates = [];
    lastTimestamp = null;
}

const addressInput = document.getElementById('address');
const clearAddress = document.getElementById('clearAddress');

addressInput.addEventListener('input', function() {
    if (addressInput.value) {
        clearAddress.style.display = 'block';
    } else {
        clearAddress.style.display = 'none'; 
    }
});

clearAddress.addEventListener('click', function() {
    addressInput.value = ''; 
    clearAddress.style.display = 'none'; 
    addressInput.focus();
});

document.getElementById('gethistorical').addEventListener('click', () => {
    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;

    const correctDates = checkDates(startDate, endDate);
    if (startDate && endDate && correctDates) {
        startDate = convertToGlobalTime(startDate);
        endDate = convertToGlobalTime(endDate);

        date1 = formatDateTime(startDate);
        date2 = formatDateTime(endDate);

        clearMap();

        const url = `/historics?startDate=${encodeURIComponent(date1)}&endDate=${encodeURIComponent(date2)}`;
        console.log("Encoded URL:", url);  
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('Data fetched:', data);
                if (data.length === 0) {
                    alert("No routes found");
                } else {
                    data.forEach(data => {
                        updateMapAndRouteHistorics(data.latitude, data.longitude, data.timestamp);
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    } else {
        alert("Ensure dates are provided and the start date is earlier than the end date.");
    }
});

document.getElementById('searchbyaddress').addEventListener('click', () => {
    const address = document.getElementById('address').value;
    const radius = document.getElementById('radius').value || 500; 

    if (address) {
        clearMap();
        
        fetch(`/geocode?address=${encodeURIComponent(address)}`)
            .then(response => response.json())
            .then(data => {
                if (data.lat && data.lng) {
                    const lat = data.lat;
                    const lng = data.lng;

                    const url = `/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
                    fetch(url)
                        .then(response => response.json())
                        .then(results => {
                            console.log('Nearby results:', results);
                            if (results.length === 0) {
                                alert("No routes found");
                            } else {
                                results.forEach(result => {
                                    updateMapAndRouteHistorics(result.latitude, result.longitude, result.timestamp);
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching nearby routes:', error);
                        });
                } else {
                    alert('Location not found');
                }
            })
            .catch(error => {
                console.error('Error fetching location:', error);
            });
    } else {
        alert('Please enter a location');
    }
});

document.getElementById('toggleSearch').addEventListener('click', () => {
    const timeControls = document.getElementById('timeControls');
    const addressControls = document.getElementById('addressControls');

    if (timeControls.style.display === 'none') {
        timeControls.style.display = 'block';
        addressControls.style.display = 'none';
        document.getElementById('toggleSearch').innerText = 'Switch to search by address';
    } else {
        timeControls.style.display = 'none';
        addressControls.style.display = 'block';
        document.getElementById('toggleSearch').innerText = 'Switch to time search';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadMap();
    document.getElementById('addressControls').style.display = 'none'; // Ocultar controles de dirección al principio
});

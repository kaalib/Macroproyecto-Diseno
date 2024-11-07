let map;
let marker, marker2, polyline, polyline2;
let path = [];
let path2 =[];
let polylines = [];
let routeCoordinates = [];
let lastTimestamp = null;
let infoWindows = [];
let markers = [];
let results = []; 
let drawnCircle;

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

//---------------------REAL TIME------------------------------------------
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 10.96854, lng: -74.82149 },
        zoom: 14
    });

    marker = new google.maps.Marker({
        position: { lat: 0, lng: 0 },
        map: map
    });

    marker2 = new google.maps.Marker({
        position: { lat: 0, lng: 0 },
        map: map
    });

    polyline = new google.maps.Polyline({
        path: path,
        strokeColor: '#6F2F9E', // Color morado
        strokeOpacity: 1.0,
        strokeWeight: 5,
        geodesic: true,
        map: map
    });

    polyline2 = new google.maps.Polyline({
        path: path2,
        strokeColor: '#FF0000', // Color rojo para el vehículo 2
        strokeOpacity: 1.0,
        strokeWeight: 5,
        geodesic: true,
        map: map
    });

    fetchLatestLocation(); // Cargar ubicación para vehículo 1 por defecto
    fetchLatestLocation2(); // Cargar ubicación para vehículo 2 por defecto (aunque lo ocultaremos si es necesario)
    updateVisibility(); // Establecer la visibilidad correcta al cargar

    // Escuchar el cambio en el selector para mostrar u ocultar las rutas
    document.getElementById('vehicleDropdown').addEventListener('change', updateVisibility);
}

// Función para redondear a 6 decimales
function roundToThreeDecimals(num) {
    return Number(num.toFixed(6));
}

function updateVisibility() {
    const selectedVehicle = document.getElementById('vehicleDropdown').value;

    if (selectedVehicle === 'all') {

        marker.setMap(map);
        polyline.setMap(map);
        marker2.setMap(map);
        polyline2.setMap(map);

        document.getElementById('vehicle1').style.display = 'block';
        document.getElementById('vehicle2').style.display = 'block';

    } else if (selectedVehicle === '1') {
        marker.setMap(map);
        polyline.setMap(map);
        marker2.setMap(null); 
        polyline2.setMap(null); 

        document.getElementById('vehicle1').style.display = 'block';
        document.getElementById('vehicle2').style.display = 'none';

        const latLng1 = new google.maps.LatLng(parseFloat(document.getElementById('latitude').innerText), parseFloat(document.getElementById('longitude').innerText));
        map.panTo(latLng1);



    } else if (selectedVehicle === '2') {

        marker2.setMap(map);
        polyline2.setMap(map);
        marker.setMap(null); 
        polyline.setMap(null); 

        document.getElementById('vehicle1').style.display = 'none';
        document.getElementById('vehicle2').style.display = 'block';

        const latLng2 = new google.maps.LatLng(parseFloat(document.getElementById('latitude2').innerText), parseFloat(document.getElementById('longitude2').innerText));
        map.panTo(latLng2);
    }

}

let shouldFetch = true;

function fetchLatestLocation() {
    if (!shouldFetch) return;
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            const roundedLat = roundToThreeDecimals(data.locationData.latitude);
            const roundedLng = roundToThreeDecimals(data.locationData.longitude);

            document.getElementById('latitude').innerText = roundedLat;
            document.getElementById('longitude').innerText = roundedLng;

            const timestamp = convertToLocalTime(data.locationData.timestamp);
            const [date, time] = timestamp.split(', ');
            document.getElementById('date').innerText = date;
            document.getElementById('time').innerText = time;

            const latLng = new google.maps.LatLng(roundedLat, roundedLng);
            marker.setPosition(latLng);

            document.getElementById('rpm').innerText = data.locationData.rpm;
            document.getElementById('speed').innerText = data.locationData.speed;

            path.push(latLng);
            polyline.setPath(path);

            const selectorValue = document.getElementById('vehicleDropdown').value;
            if (selectorValue === '1') {
                map.panTo(latLng);
            }
        })
        .catch(err => console.error('Error fetching latest location for vehicle 1:', err));
}

function fetchLatestLocation2() {
    if (!shouldFetch) return;
    fetch('/data2')  // Datos del segundo vehículo
        .then(response => response.json())
        .then(data => {
            const roundedLat = roundToThreeDecimals(data.locationData2.latitude);
            const roundedLng = roundToThreeDecimals(data.locationData2.longitude);

            document.getElementById('latitude2').innerText = roundedLat;
            document.getElementById('longitude2').innerText = roundedLng;

            const timestamp = convertToLocalTime(data.locationData2.timestamp);
            const [date, time] = timestamp.split(', ');
            document.getElementById('date2').innerText = date;
            document.getElementById('time2').innerText = time;

            const latLng = new google.maps.LatLng(roundedLat, roundedLng);
            marker2.setPosition(latLng);

            path2.push(latLng);
            polyline2.setPath(path2);

            const selectorValue = document.getElementById('vehicleDropdown').value;
            if (selectorValue === '2') {
                map.panTo(latLng);
            }
        })
        .catch(err => console.error('Error fetching latest location for vehicle 2:', err));
}

setInterval(fetchLatestLocation, 10000);
setInterval(fetchLatestLocation2, 10000);

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
        timeZone: 'UTC'
    };

    const formattedDate = new Intl.DateTimeFormat('en-GB', options).format(localDate);
    return formattedDate;
}



//--------------------------------HISTORICAL--------------------------------------------
async function initHistoricalMap() {
    clearMap();
    shouldFetch = false; 
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const initialPosition = { lat: 10.983831, lng: -74.802631 };

    map = new Map(document.getElementById("map"), {
        zoom: 14,
        center: initialPosition,
        mapId: "DEMO_MAP_ID"
    });

    marker = new AdvancedMarkerElement({
        map: map,

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

    autocomplete.addListener('place_changed', function () {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            console.error("No se pudo encontrar la ubicación");
            return;
        }
        console.log("Sugerencia seleccionada:", place.formatted_address);
    });
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

function isSameLocation(coord1, coord2) {
    return Math.round(coord1.lat * 10000) === Math.round(coord2.lat * 10000) &&
           Math.round(coord1.lng * 10000) === Math.round(coord2.lng * 10000);
}
document.getElementById('gethistorical').addEventListener('click', () => {

    let startDate = document.getElementById('startDate');
    let endDate = document.getElementById('endDate');

    const correctDates = checkDates(startDate.value, endDate.value);
    let isValid = true;

    startDate.classList.remove('input-error');
    endDate.classList.remove('input-error');

    if (!startDate.value || !endDate.value || !correctDates) {
        isValid = false;

        if (!startDate.value) {
            startDate.classList.add('input-error');
        }
        if (!endDate.value) {
            endDate.classList.add('input-error');
        }
        if (startDate.value && endDate.value && !correctDates) {
            startDate.classList.add('input-error');
            endDate.classList.add('input-error');
        }
    }

    if (isValid) {
        let formattedStartDate = convertToGlobalTime(startDate.value);
        let formattedEndDate = convertToGlobalTime(endDate.value);

        let date1 = formatDateTime(formattedStartDate);
        let date2 = formatDateTime(formattedEndDate);

        clearMap();

        const url = `/historics?startDate=${encodeURIComponent(date1)}&endDate=${encodeURIComponent(date2)}`;
        console.log("Encoded URL:", url);  
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('Data fetched:', data);
                results = data;
                if (data.length === 0) {
                    alert("No se encontraron rutas");
                    clearMap();
                } else {
                    data.forEach(data => {
                        updateMapAndRouteHistorics(data.id, data.latitude, data.longitude, data.timestamp);
                        document.getElementById('Searchsection').style.display='block';
                    });
                    setupSlider(data.length);
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }
});

function updateMapAndRouteHistorics(carId, lat, lng, timestamp) {
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
            drawPolylineHistorics(lastPosition, newPosition, lastTimestamp, carId);
        } else if (timeDiff >= 1) {
            routeCoordinates = [newPosition];
        }

        lastTimestamp = newTimestamp;
    }
}


function drawPolylineHistorics(origin, destination, timestamp, carId) {
    const path = [
        new google.maps.LatLng(origin.lat, origin.lng),
        new google.maps.LatLng(destination.lat, destination.lng)
    ];

    const bearing = calculateBearing(origin, destination);

    let markerColor = '#6F2F9E';
    let polylineColor = '#6F2F9E'; 

    if (carId === 2) {
        markerColor = '#FF0000';
        polylineColor = '#FF0000';  
    }

        const startMarker = new google.maps.Marker({
            position: origin,
            map: map,
            title: "Inicio",
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                fillColor: markerColor,
                fillOpacity: 1,
                strokeWeight: 2,
                rotation: bearing
            }
        });

    markers.push({ marker: startMarker, carId });

    const adjustedTimestamp = adjustForTimezone(timestamp);

    const infoWindow = new google.maps.InfoWindow({
        content: `<div><div><strong>Car ${carId}</strong><br><strong>Registered Date:</strong><br> ${adjustedTimestamp}</div>`,
        maxWidth: 200
    });

    infoWindows.push(infoWindow);

    startMarker.addListener('click', function() {
        infoWindow.open(map, startMarker);
    });

    startMarker.addListener('mouseover', function() {
        infoWindow.open(map, startMarker);
    });

    startMarker.addListener('mouseout', function() {
        infoWindow.close();
    });

    const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: polylineColor,
        strokeOpacity: 1.0,
        strokeWeight: 5
    });

    polyline.setMap(map);
    polylines.push({ polyline, carId });
}

function setupSlider(filteredSliderData) {
    const slider = document.getElementById('marker-slider');
    slider.max = filteredSliderData.length - 1;
    slider.value = 0;
    slider.style.display = 'block';

    updateMarkerPosition(0, filteredSliderData); // Pasa los datos filtrados a updateMarkerPosition

    slider.addEventListener('input', (event) => {
        const index = parseInt(event.target.value);
        updateMarkerPosition(index, filteredSliderData); // Pasa los datos filtrados al mover el slider
    });
}


function updateMarkerPosition(index, filteredSliderData) {
    if (marker) {
        marker.setMap(null);
    }

    const position = new google.maps.LatLng(filteredSliderData[index].latitude, filteredSliderData[index].longitude); // Usa los datos filtrados
    marker = new google.maps.Marker({
        position: position,
        map: map,
        title: filteredSliderData[index].timestamp
    });

    map.panTo(position);
}


const dropdown = document.getElementById('vehicleDropdownHistorical');
dropdown.addEventListener('change', function() {
    const selectedValue = dropdown.value;

    let filteredSliderData = results;
    if (selectedValue === '1') {
        filteredSliderData = results.filter(data => data.id === 1);
    } else if (selectedValue === '2') {
        filteredSliderData = results.filter(data => data.id === 2);
    }

    setupSlider(filteredSliderData);

    for (let { polyline, carId } of polylines) {
        if (selectedValue === 'all') {
            polyline.setMap(map);
        } else if ((selectedValue === '1' && carId === 1) || (selectedValue === '2' && carId === 2)) {
            polyline.setMap(map);
        } else {
            polyline.setMap(null);
        }
    }

    for (let { marker, carId } of markers) {
        if (selectedValue === 'all') {
            marker.setMap(map);
        } else if ((selectedValue === '1' && carId === 1) || (selectedValue === '2' && carId === 2)) {
            marker.setMap(map);
        } else {
            marker.setMap(null);
        }
    }
});

function clearMap() {
    infoWindows.forEach(infoWindow => infoWindow.close());
    infoWindows = [];

    markers.forEach(item => item.marker.setMap(null));  
    markers = [];  

    polylines.forEach(item => item.polyline.setMap(null)); 
    polylines = []; 

    routeCoordinates = [];
    lastTimestamp = null;

    if (drawnCircle) {
        drawnCircle.setMap(null);
        drawnCircle = null;
    }
}


function calculateBearing(start, end) {
    const lat1 = (start.lat * Math.PI) / 180;
    const lon1 = (start.lng * Math.PI) / 180;
    const lat2 = (end.lat * Math.PI) / 180;
    const lon2 = (end.lng * Math.PI) / 180;

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
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

document.getElementById('startDate').addEventListener('input', () => {
    validarFechas();
});

document.getElementById('endDate').addEventListener('input', () => {
    validarFechas();
});

function validarFechas() {
    let startDate = document.getElementById('startDate').value;
    let endDate = document.getElementById('endDate').value;

    if (startDate && endDate) {
        const fechaInicio = new Date(startDate);
        const fechaFin = new Date(endDate);

        if (fechaInicio > fechaFin) {
            document.getElementById('endDate').value = '';
        }
    }
}

document.getElementById('searchbyaddress').addEventListener('click', () => {
    let startDate = document.getElementById('startDate');
    let endDate = document.getElementById('endDate');
    const address = document.getElementById('address');
    const radius = parseInt(document.getElementById('radius').value) || 500;

    const correctDates = checkDates(startDate.value, endDate.value);
    let isValid = true;

    startDate.classList.remove('input-error');
    endDate.classList.remove('input-error');
    address.classList.remove('input-error');

    // Validar fechas y dirección
    if (!startDate.value) {
        isValid = false;
        startDate.classList.add('input-error');
    }
    if (!endDate.value) {
        isValid = false;
        endDate.classList.add('input-error');
    }
    if (!address.value) {
        isValid = false;
        address.classList.add('input-error');
    }
    if (startDate.value && endDate.value && !correctDates) {
        isValid = false;
        startDate.classList.add('input-error');
        endDate.classList.add('input-error');
    }

    if (isValid) {
        clearMap(); 
        const formattedStartDate = convertToGlobalTime(startDate.value);
        const formattedEndDate = convertToGlobalTime(endDate.value);

        const date1 = formatDateTime(formattedStartDate);
        const date2 = formatDateTime(formattedEndDate);

        fetch(`/geocode?address=${encodeURIComponent(address.value)}`)
            .then(response => response.json())
            .then(data => {
                if (data.lat && data.lng) {
                    const lat = data.lat;
                    const lng = data.lng;

                    drawnCircle = new google.maps.Circle({
                        strokeColor: '#6F2F9E',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#6F2F9E',
                        fillOpacity: 0.1,
                        map: map,
                        center: { lat, lng },
                        radius: radius
                    });

                    const url = `/nearbyhistorics?lat=${lat}&lng=${lng}&radius=${radius}&startDate=${encodeURIComponent(date1)}&endDate=${encodeURIComponent(date2)}`;
                    console.log("Encoded URL:", url);

                    fetch(url)
                        .then(response => response.json())
                        .then(data => {
                            console.log('Data fetched:', data);
                            results = data;

                            if (data.length === 0) {
                                alert('No routes found');
                                clearMap();
                            } else {
                                data.forEach(item => {
                                    updateMapAndRouteHistorics(item.id, item.latitude, item.longitude, item.timestamp);
                                    document.getElementById('slider').style.display = 'block';
                                });
                                setupSlider(data.length);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching data:', error);
                        });
                } else {
                    address.classList.add('input-error');
                }
            })
            .catch(error => {
                console.error('Error fetching geocode data:', error);
            });
    }
});



let isHistoricalVisible = false;

document.getElementById('historicalDataBtn').addEventListener('click', function() { 
    initHistoricalMap();
    if (isHistoricalVisible) {
        document.getElementById('historicalControls').style.display = 'none';
        document.getElementById('realTimeControls').style.display = '';
    } else {
        document.getElementById('realTimeControls').style.display = 'none';
        document.getElementById('historicalControls').style.display = '';
        document.getElementById('realtimeBtn').addEventListener('click', function() {
            clearMap();
            shouldFetch = true;
            initMap();       
        if (isHistoricalVisible) {
            document.getElementById('historicalControls').style.display = '';
            document.getElementById('realTimeControls').style.display = 'none';
        } else {
            document.getElementById('realTimeControls').style.display = '';
            document.getElementById('historicalControls').style.display = 'none';

        }
    });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadMap();
    document.getElementById('addressControls').style.display = 'none';
});
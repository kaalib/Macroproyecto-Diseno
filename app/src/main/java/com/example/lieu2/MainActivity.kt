package com.example.lieu2

import android.annotation.SuppressLint
import android.location.LocationManager
import android.os.Bundle
import android.Manifest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Button
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContract
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.example.lieu2.databinding.ActivityMainBinding
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.Socket
import java.io.PrintWriter

class MainActivity : AppCompatActivity() {
    // attributes
    private lateinit var binding: ActivityMainBinding
    private lateinit var fusedLocationProviderClient: FusedLocationProviderClient

    private var locationInfoLat: String? = null
    private var locationInfoLon: String? = null
    private var locationInfoTim: String? = null
    private var job: Job? = null

    @SuppressLint("MissingPermission")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        binding = ActivityMainBinding.inflate(layoutInflater)
        val view = binding.root
        setContentView(view)

        fusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(this)

        val locationPermissionRequest = registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->
            when {
                permissions.getOrDefault(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    defaultValue = false
                ) || permissions.getOrDefault(
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    defaultValue = false
                ) -> {
                    Toast.makeText(this, "Location access granted", Toast.LENGTH_SHORT).show()

                    if (isLocationEnabled()) {
                        createLocationRequest()

                    } else {
                        Toast.makeText(this, "Please Turn on the location", Toast.LENGTH_SHORT).show()
                        createLocationRequest()
                    }
                }

                else -> {
                    Toast.makeText(this, "No location access", Toast.LENGTH_SHORT).show()
                }
            }
        }


        locationPermissionRequest.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )


        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }

    @SuppressLint("MissingPermission")
    private fun createLocationRequest() {

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            10000
        ).setMinUpdateIntervalMillis(10000).build()

        val sdfApp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())

        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                for (location in locationResult.locations) {

                    val formattedTime = sdfApp.format(Date(location.time))

                    locationInfoLat = "Latitude: ${location.latitude}"
                    locationInfoLon = "Longitude: ${location.longitude}"
                    locationInfoTim = "Time: $formattedTime"

                    binding.textViewLat.text = locationInfoLat
                    binding.textViewLon.text = locationInfoLon
                    binding.textViewTim.text = locationInfoTim

                    sendUDPData(location.latitude, location.longitude, location.time)
                    sendTCPData(location.latitude, location.longitude, location.time)

                }
            }
        }
        fusedLocationProviderClient.requestLocationUpdates(locationRequest, locationCallback, null)



        val builder = LocationSettingsRequest.Builder().addLocationRequest(locationRequest)
        val client = LocationServices.getSettingsClient(this)
        val task = client.checkLocationSettings(builder.build())

        task.addOnSuccessListener {
        }

        task.addOnFailureListener { e ->
            if (e is ResolvableApiException) {
                try {
                    e.startResolutionForResult(
                        this,
                        100
                    )
                } catch (sendEx: java.lang.Exception) {
                }
            }
        }
    }



    private fun isLocationEnabled(): Boolean {
        val locationManager = getSystemService(LOCATION_SERVICE) as LocationManager

        try {
            return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    private fun sendUDPData(latitude: Double, longitude: Double, timestamp: Long) {
        val thread = Thread {
            try {
                val socket = DatagramSocket()

                val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                val formattedTime = sdf.format(Date(timestamp))

                val message = "$latitude,$longitude,$formattedTime"
                val data = message.toByteArray()


                // first IP address and UDP port
                val port = 5055
                val addressCarlos = InetAddress.getByName("lieucarlos.ddns.net")
                val packetCarlos = DatagramPacket(data, data.size, addressCarlos, port)

                // second IP address and UDP port
                val addressKaren = InetAddress.getByName("lieukaren.ddns.net")
                val packetKaren = DatagramPacket(data, data.size, addressKaren, port)

                val addressIsa = InetAddress.getByName("lieuisa.ddns.net")
                val packetIsa = DatagramPacket(data, data.size, addressIsa, port)
                socket.send(packetCarlos)
                socket.send(packetKaren)
                socket.send(packetIsa)

                // closing socket
                socket.close()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        thread.start()
    }

    private fun sendTCPData(latitude: Double, longitude: Double, timestamp: Long) {
        val thread = Thread {
            try {

                val message = "Latitude: $latitude, Longitude: $longitude, Time: $timestamp"


                val socketCarlos = Socket("proyectoddnscarlos.ddns.net", 12222) // IP and port number
                val writerCarlos = PrintWriter(socketCarlos.getOutputStream(), true)
                writerCarlos.println(message)
                writerCarlos.close()
                socketCarlos.close()

                val socketKaren = Socket("proyectoddns.ddns.net", 23653) // IP and port number
                val writerKaren = PrintWriter(socketKaren.getOutputStream(), true)
                writerKaren.println(message)
                writerKaren.close()
                socketKaren.close()


            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        thread.start()
    }
}


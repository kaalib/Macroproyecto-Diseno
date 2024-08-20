package com.example.lieu2

import android.annotation.SuppressLint
import android.location.LocationManager
import android.os.Bundle
import android.Manifest
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
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.android.gms.location.LocationRequest
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.Socket
import java.io.PrintWriter

class MainActivity : AppCompatActivity() {

    private lateinit var btnGetLocation: Button
    private lateinit var binding: ActivityMainBinding
    private lateinit var fusedLocationProviderClient: FusedLocationProviderClient

    private var locationInfoLat: String? = null
    private var locationInfoLon: String? = null
    private var locationInfoTim: String? = null

    @SuppressLint("MissingPermission")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        binding = ActivityMainBinding.inflate(layoutInflater)
        val view = binding.root
        setContentView(view)

        btnGetLocation = findViewById(R.id.btnGetLocation)

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
                        val result = fusedLocationProviderClient.getCurrentLocation(
                            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                            CancellationTokenSource().token
                        )
                        result.addOnCompleteListener {
                            val location = it.result

                            locationInfoLat = "Latitude: ${location.latitude}"
                            locationInfoLon = "Longitude: ${location.longitude}"
                            locationInfoTim = "Time: ${location.time}"

                            binding.textViewLat.text = locationInfoLat
                            binding.textViewLon.text = locationInfoLon
                            binding.textViewTim.text = locationInfoTim

                            // sending data to UDP and TCP
                            sendUDPData(location.latitude, location.longitude, location.time)
                            sendTCPData(location.latitude, location.longitude, location.time)
                        }
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

        binding.btnGetLocation.setOnClickListener {
            locationPermissionRequest.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
    }

    private fun createLocationRequest() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            10000
        ).setMinUpdateIntervalMillis(5000).build()

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
                // Creating socket UDP
                val socket = DatagramSocket()
                val message = "Latitude: $latitude, Longitude: $longitude, Time: $timestamp"
                // Translate message to binary
                val data = message.toByteArray()
                // IP address and UDP port
                val address = InetAddress.getByName("181.235.95.11")
                val port = 5055
                val packet = DatagramPacket(data, data.size, address, port)

                socket.send(packet)

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
                val socket = Socket("181.235.95.11", 12222) // IP and port number
                val writer = PrintWriter(socket.getOutputStream(), true)
                val message = "Latitude: $latitude, Longitude: $longitude, Time: $timestamp"
                writer.println(message)
                writer.close()
                socket.close()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        thread.start()
    }
}


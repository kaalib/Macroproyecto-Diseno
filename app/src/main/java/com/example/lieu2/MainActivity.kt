package com.example.lieu2

import android.annotation.SuppressLint
import android.location.LocationManager
import android.os.Bundle
import android.Manifest
import android.content.pm.PackageManager
import android.telephony.SmsManager
import android.view.View
import android.widget.Button
import android.widget.EditText
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



class MainActivity : AppCompatActivity() {

    private lateinit var phoneNumber: EditText
    private lateinit var btnGetLocation: Button
    private lateinit var binding: ActivityMainBinding
    private lateinit var fusedLocationProviderClient: FusedLocationProviderClient

    private var locationInfo: String? = null
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

        phoneNumber = findViewById(R.id.PhoneNumber)
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
                            val location  = it.result

                            locationInfo = "Latitude: ${location.latitude}\nLongitude: ${location.longitude}\nTime: ${location.time}"

                            locationInfoLat = "Latitude: ${location.latitude}"
                            locationInfoLon = "Longitude: ${location.longitude}"
                            locationInfoTim = "Time: ${location.time}"

                            binding.textViewLat.text = locationInfoLat
                            binding.textViewLon.text = locationInfoLon
                            binding.textViewTim.text = locationInfoTim
                            sendSMS()
                        }
                    } else {
                        Toast.makeText(this, "Please Turn on the location", Toast.LENGTH_SHORT)
                            .show()
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

            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.SEND_SMS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.SEND_SMS), 100)
            }
        }

        ActivityCompat.OnRequestPermissionsResultCallback { requestCode, permissions, grantResults ->
            if (requestCode == 100 && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Re-attempt to send SMS if permission is granted
                sendSMS()
            } else {
                Toast.makeText(this, "SMS permissions denied", Toast.LENGTH_SHORT).show()
            }
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

    private fun sendSMS() {
        val phone = phoneNumber.text.toString()

        if (phone.isNotEmpty() && locationInfo != null) {
            val smsManager = SmsManager.getDefault()
            smsManager.sendTextMessage(phone, null, locationInfo, null, null)
            Toast.makeText(this, "SMS sent", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Please enter phone number", Toast.LENGTH_SHORT).show()
        }
    }

}

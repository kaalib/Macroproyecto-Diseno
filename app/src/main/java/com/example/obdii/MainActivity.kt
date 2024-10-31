package com.example.obdii

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private var inputStream: InputStream? = null
    private var targetDevice: BluetoothDevice? = null
    private val obdUUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val obdDeviceName = "OBDII"
    private val obdPin = "1234"

    private lateinit var connectButton: Button
    private lateinit var rpmTextView: TextView
    private lateinit var speedTextView: TextView

    private val handler = Handler()

    private var rpm: Int = 0
    private var speed: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        connectButton = findViewById(R.id.connectButton)
        rpmTextView = findViewById(R.id.rpmTextView)
        speedTextView = findViewById(R.id.speedTextView)

        rpmTextView.text = "-"
        speedTextView.text = "-"

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {

            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.BLUETOOTH_CONNECT,
                    Manifest.permission.BLUETOOTH_SCAN,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ),
                1
            )
        } else {
            initializeBluetooth()
        }

        connectButton.setOnClickListener {
            findAndConnectToObd()
        }
    }

    private fun initializeBluetooth() {
        if (bluetoothAdapter == null) {
            Toast.makeText(this, "Bluetooth no está disponible", Toast.LENGTH_SHORT).show()
            finish()
        } else if (!bluetoothAdapter.isEnabled) {
            val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
            bluetoothEnableLauncher.launch(enableBtIntent)
        }
    }

    private val bluetoothEnableLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        if (bluetoothAdapter?.isEnabled == true) {
            Toast.makeText(this, "Bluetooth habilitado", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Bluetooth es necesario para conectar al OBD-II", Toast.LENGTH_SHORT).show()
        }
    }

    @SuppressLint("MissingPermission")
    private fun findAndConnectToObd() {
        val filter = IntentFilter(BluetoothDevice.ACTION_FOUND)
        registerReceiver(receiver, filter)
        bluetoothAdapter?.startDiscovery()
        Toast.makeText(this, "Buscando dispositivo OBD-II...", Toast.LENGTH_SHORT).show()
    }

    private val receiver = object : BroadcastReceiver() {
        @SuppressLint("MissingPermission")
        override fun onReceive(context: Context, intent: Intent) {
            val action: String? = intent.action
            if (BluetoothDevice.ACTION_FOUND == action) {
                val device: BluetoothDevice? = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                device?.let {
                    if (it.name == obdDeviceName) {
                        targetDevice = it
                        bluetoothAdapter?.cancelDiscovery()
                        pairWithObd()
                    }
                }
            }
        }
    }

    private fun pairWithObd() {
        targetDevice?.let { device ->
            try {
                val method = device::class.java.getMethod("setPin", ByteArray::class.java)
                method.invoke(device, obdPin.toByteArray())
                connectToDevice(device)
            } catch (e: Exception) {
                Toast.makeText(this, "Error al emparejar con OBD-II", Toast.LENGTH_SHORT).show()
                e.printStackTrace()
            }
        } ?: run {
            Toast.makeText(this, "Dispositivo OBD-II no encontrado", Toast.LENGTH_SHORT).show()
        }
    }

    @SuppressLint("MissingPermission")
    private fun connectToDevice(device: BluetoothDevice) {
        try {
            bluetoothSocket = device.createRfcommSocketToServiceRecord(obdUUID)
            bluetoothSocket?.connect()
            outputStream = bluetoothSocket?.outputStream
            inputStream = bluetoothSocket?.inputStream
            Toast.makeText(this, "Conexión establecida con el OBD-II", Toast.LENGTH_SHORT).show()
            initializeObdCommunication()
        } catch (e: IOException) {
            Toast.makeText(this, "Error al conectar con OBD-II", Toast.LENGTH_SHORT).show()
            e.printStackTrace()
            try {
                bluetoothSocket?.close()
            } catch (closeException: IOException) {
                closeException.printStackTrace()
            }
        }
    }

    private fun initializeObdCommunication() {
        sendObdCommand("ATZ")
        sendObdCommand("ATE0")
        sendObdCommand("ATSP0")
        readDataRepeatedly()
    }

    private fun readDataRepeatedly() {
        handler.post(object : Runnable {
            private var sendCount = 0

            override fun run() {
                requestRPM()
                requestSpeed()

                sendCount++
                if (sendCount >= 5) {
                    sendUDPData()
                    sendCount = 0
                }

                handler.postDelayed(this, 2000)
            }
        })
    }

    private fun requestRPM() {
        sendObdCommand("010C")
        val rpmResponse = receiveObdResponse()
        rpmResponse?.let {
            val bytes = it.replace(">", "").trim().split(" ")
            if (bytes.size >= 4) {
                val a = bytes[2].toInt(16)
                val b = bytes[3].toInt(16)
                rpm = ((a * 256) + b) / 4
                rpmTextView.text = rpm.toString()
                sendUDPData()
            }
        }
    }

    private fun requestSpeed() {
        sendObdCommand("010D")
        val speedResponse = receiveObdResponse()
        speedResponse?.let {
            val bytes = it.replace(">", "").trim().split(" ")
            if (bytes.size >= 3) {
                speed = bytes[2].toInt(16)
                speedTextView.text = speed.toString()
                sendUDPData()
            }
        }
    }

    private fun sendObdCommand(command: String) {
        outputStream?.write((command + "\r").toByteArray())
        outputStream?.flush()
    }

    private fun receiveObdResponse(): String? {
        return try {
            val buffer = ByteArray(1024)
            val bytes = inputStream?.read(buffer)
            bytes?.let { String(buffer, 0, it).trim() }
        } catch (e: IOException) {
            Toast.makeText(this, "Error al recibir datos", Toast.LENGTH_SHORT).show()
            e.printStackTrace()
            null
        }
    }

    private fun sendUDPData() {
        Thread {
            try {
                val socket = DatagramSocket()
                val serverAddresses = listOf("lieucarlos.ddns.net", "lieukaren.ddns.net", "lieuisa.ddns.net")
                val data = "$rpm,$speed"

                for (server in serverAddresses) {
                    val address = InetAddress.getByName(server)
                    val packet = DatagramPacket(data.toByteArray(), data.length, address, 5005)
                    socket.send(packet)
                }
                socket.close()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }


    override fun onDestroy() {
        super.onDestroy()
        try {
            bluetoothSocket?.close()
        } catch (e: IOException) {
            e.printStackTrace()
        }
        unregisterReceiver(receiver)
    }
}

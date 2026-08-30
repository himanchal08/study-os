package com.studyos.tracker

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // A simple layout created programmatically to avoid complex XML
        val button = Button(this).apply {
            text = "Start Tracking Service"
            setOnClickListener {
                startService(Intent(this@MainActivity, TrackingService::class.java))
                Toast.makeText(this@MainActivity, "Tracking Started!", Toast.LENGTH_SHORT).show()
            }
        }
        setContentView(button)
    }
}

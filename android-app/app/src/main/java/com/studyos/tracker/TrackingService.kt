package com.studyos.tracker

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.IBinder
import android.util.Log
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException

class TrackingService : Service() {
    private val client = OkHttpClient()
    
    // Replace these with actual Supabase credentials for the user
    private val supabaseUrl = "https://YOUR_SUPABASE_URL.supabase.co"
    private val supabaseKey = "YOUR_SUPABASE_ANON_KEY"
    // Since this is a simple tracker, we hardcode the user_id for their account
    private val userId = "USER_ID_HERE"

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_USER_PRESENT) {
                Log.d("TrackingService", "Phone Unlocked!")
                logDistractionToSupabase()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        val filter = IntentFilter(Intent.ACTION_USER_PRESENT)
        registerReceiver(receiver, filter)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(receiver)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun logDistractionToSupabase() {
        // Send a POST request to the phone_events table
        val json = """
            {
                "user_id": "${userId}",
                "event_type": "distraction_start",
                "app_package": "system.unlock",
                "source_client": "android"
            }
        """.trimIndent()
        
        val body = json.toRequestBody("application/json".toMediaTypeOrNull())
        val request = Request.Builder()
            .url("${supabaseUrl}/rest/v1/phone_events")
            .addHeader("apikey", supabaseKey)
            .addHeader("Authorization", "Bearer ${supabaseKey}")
            .addHeader("Content-Type", "application/json")
            .post(body)
            .build()
            
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("TrackingService", "Failed to log event", e)
            }
            override fun onResponse(call: Call, response: Response) {
                Log.d("TrackingService", "Event logged successfully")
            }
        })
    }
}

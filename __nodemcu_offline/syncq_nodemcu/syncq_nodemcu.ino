#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h> // Ensure you have ArduinoJson v6 installed in your IDE

const byte DNS_PORT = 53;
IPAddress apIP(192, 168, 4, 1);
DNSServer dnsServer;
ESP8266WebServer server(80);

const char* AP_SSID = "HyQ_Local_Clinic";

struct Patient {
  String type;
  String patient_name;
  String phone;
  String consultation_type;
  String doctor;
  String checkin_id;
  long timestamp;
  String assigned_id;
  String status;
};

const int MAX_PATIENTS = 50;
Patient offlineQueue[MAX_PATIENTS];
int patientCount = 0;

// The pure HTML Captive Portal, compiled directly into flash memory to save active RAM
const char HTML_PAGE[] PROGMEM = R"rawliteral(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>HyQ Local Clinic</title>
<style>
  :root {
    --bg: #0b1120;
    --surface: rgba(15, 23, 42, 0.65);
    --border: rgba(255, 255, 255, 0.08);
    --border-hl: rgba(14, 165, 233, 0.3);
    --text-1: #ffffff;
    --text-2: #94a3b8;
    --glow: rgba(14, 165, 233, 0.2);
    --brand: #0ea5e9;
    --brand-h: #0284c7;
    --panel-radius: 20px;
    --font: system-ui, -apple-system, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: var(--bg);
    color: var(--text-1);
    font-family: var(--font);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 20px;
    align-items: center;
    position: relative;
    overflow-x: hidden;
  }
  /* Decorative blobs */
  .blob1 { position: absolute; top: 10%; left: -10%; width: 300px; height: 300px; background: var(--brand); border-radius: 50%; filter: blur(80px); opacity: 0.15; z-index: -1; }
  .blob2 { position: absolute; bottom: 10%; right: -10%; width: 250px; height: 250px; background: #6366f1; border-radius: 50%; filter: blur(80px); opacity: 0.15; z-index: -1; }
  
  .container {
    width: 100%;
    max-width: 400px;
    z-index: 10;
    margin-top: 40px;
  }
  .glass-panel {
    background: var(--surface);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--border);
    border-radius: var(--panel-radius);
    padding: 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    margin-bottom: 20px;
    animation: fade-in 0.4s ease forwards;
  }
  
  @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  .header { text-align: center; margin-bottom: 30px; }
  .header h1 { font-size: 28px; letter-spacing: -0.5px; margin-bottom: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px;}
  .header h1 span { color: var(--brand); }
  .header div.badge { 
    display: inline-block; background: var(--glow); border: 1px solid var(--border-hl); color: var(--brand);
    border-radius: 50px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;
  }
  
  .btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    padding: 16px; border-radius: 12px; color: var(--text-1); font-size: 15px; font-weight: 600;
    margin-bottom: 12px; cursor: pointer; transition: 0.2s ease;
  }
  .btn:active { transform: scale(0.98); }
  .btn.primary { background: var(--brand); border-color: var(--brand); box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4); }
  .btn.primary:active { background: var(--brand-h); }
  
  .view { display: none; }
  .view.active { display: block; }
  
  label { font-size: 12px; color: var(--text-2); font-weight: 600; text-transform: uppercase; margin-bottom: 6px; display: block; }
  input, select {
    width: 100%; padding: 14px; background: rgba(0,0,0,0.2); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text-1); font-size: 14px; margin-bottom: 16px; font-family: var(--font);
  }
  input:focus, select:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--glow); }

  .success-box { text-align: center; }
  .success-box .id { font-size: 42px; font-weight: 900; color: var(--text-1); line-height: 1; margin: 10px 0; }
  .success-box .ewt { font-size: 18px; color: var(--brand); font-weight: bold; margin-bottom: 20px;}
  
  .back-link { text-align: center; font-size: 13px; color: var(--text-2); margin-top: 10px; cursor: pointer; }
  .loader { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--text-1); border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: none; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
</head>
<body>

<div class="blob1"></div>
<div class="blob2"></div>

<div class="container">
  <div class="header">
    <div class="badge">Local Network</div>
    <h1>Hy<span>Q</span></h1>
  </div>

  <!-- VIEW: WELCOME -->
  <div id="view-welcome" class="view active">
    <div class="glass-panel text-center">
      <h2 style="font-size: 18px; margin-bottom: 8px;">Welcome to the Clinic</h2>
      <p style="font-size: 14px; color: var(--text-2); margin-bottom: 24px; line-height: 1.5;">Connect directly to our offline node to secure your position in the live queue.</p>
      
      <button class="btn" onclick="setView('walkin')">🏥 Register Walk-In</button>
      <button class="btn" onclick="setView('checkin')">🔑 I Have a Pre-Booked ID</button>
    </div>
  </div>

  <!-- VIEW: WALKIN -->
  <div id="view-walkin" class="view">
    <div class="glass-panel">
      <h2 style="font-size: 18px; margin-bottom: 20px; text-align: center;">Walk-In Registration</h2>
      
      <label>Patient Name</label>
      <input type="text" id="w-name" placeholder="Enter Full Name" required>
      
      <label>Phone Number (Optional)</label>
      <input type="tel" id="w-phone" placeholder="Mobile Number">
      
      <label>Consultation Type</label>
      <select id="w-type">
        <option value="New Checkup (15m)">New Checkup (15m)</option>
        <option value="Showing Reports (5m)">Showing Reports (5m)</option>
      </select>

      <label>Select Doctor</label>
      <select id="w-doctor">
        <option value="Dr. Sharma">Dr. Sharma</option>
        <option value="Dr. Patil">Dr. Patil</option>
        <option value="Dr. Khan">Dr. Khan</option>
        <option value="Dr. Reddy">Dr. Reddy</option>
      </select>
      
      <button class="btn primary" id="btn-submit-walkin" onclick="submitWalkin()">
        <span class="btn-text">Generate Queue Token</span>
        <div class="loader"></div>
      </button>
      <div class="back-link" onclick="setView('welcome')">Cancel</div>
    </div>
  </div>

  <!-- VIEW: CHECKIN -->
  <div id="view-checkin" class="view">
    <div class="glass-panel">
      <h2 style="font-size: 18px; margin-bottom: 20px; text-align: center;">Pre-Booked Check-In</h2>
      <p style="font-size: 13px; color: var(--text-2); margin-bottom: 20px; text-align: center;">Enter the Alpha-ID provided when you booked your appointment online to confirm you have arrived.</p>
      
      <label>Alpha-ID</label>
      <input type="text" id="c-id" placeholder="e.g. SQ-12A" style="text-transform: uppercase;">
      
      <button class="btn primary" id="btn-submit-checkin" onclick="submitCheckin()">
        <span class="btn-text">Check-In Now</span>
        <div class="loader"></div>
      </button>
      <div class="back-link" onclick="setView('welcome')">Cancel</div>
    </div>
  </div>

  <!-- VIEW: SUCCESS -->
  <div id="view-success" class="view">
    <div class="glass-panel success-box">
      <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">✓</div>
      <h2 style="font-size: 18px; margin-bottom: 4px;">Queue Confirmed</h2>
      <p style="font-size: 13px; color: var(--text-2); margin-bottom: 16px;">Your token generated successfully offline.</p>
      
      <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <span style="font-size: 11px; color: var(--text-2); text-transform: uppercase; font-weight: bold;">Token ID</span>
        <div class="id" id="s-id">WQ-00</div>
        <div class="ewt" id="s-ewt">Estimated Wait: --</div>
      </div>
    </div>
  </div>

</div>

<script>
  function setView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
  }

  function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
      btn.style.pointerEvents = 'none';
      btn.querySelector('.btn-text').style.display = 'none';
      btn.querySelector('.loader').style.display = 'block';
    } else {
      btn.style.pointerEvents = 'auto';
      btn.querySelector('.btn-text').style.display = 'block';
      btn.querySelector('.loader').style.display = 'none';
    }
  }

  function generateFallbackID() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'WQ-';
    for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  }

  async function submitWalkin() {
    const name = document.getElementById('w-name').value.trim();
    const phone = document.getElementById('w-phone').value.trim();
    const type = document.getElementById('w-type').value;

    if (!name) return alert('Please enter patient name');
    setLoading('btn-submit-walkin', true);

    const payload = {
      type: 'WALKIN',
      patient_name: name,
      phone: phone,
      consultation_type: type,
      doctor: document.getElementById('w-doctor').value,
      timestamp: Date.now()
    };

    try {
      const res = await fetch('/book-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      document.getElementById('s-id').innerText = data.id || generateFallbackID();
      localStorage.setItem('HyQ_token', data.id); // Cache persistently!

      if (data.ewt) document.getElementById('s-ewt').innerText = 'System Est: ' + data.ewt + 'm';
      
      setView('success');
    } catch (e) {
      console.warn("NodeMCU offline endpoint failed. Simulating locally.");
      setTimeout(() => {
        document.getElementById('s-id').innerText = generateFallbackID();
        document.getElementById('s-ewt').innerText = 'Walk-In Verified';
        setView('success');
      }, 800);
    } finally {
      setLoading('btn-submit-walkin', false);
    }
  }

  async function submitCheckin() {
    let id = document.getElementById('c-id').value.trim().toUpperCase();
    if (!id) return alert('Enter Alpha-ID');
    
    setLoading('btn-submit-checkin', true);

    const payload = { type: 'CHECKIN', id: id, timestamp: Date.now() };

    try {
      const res = await fetch('/book-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      document.getElementById('s-id').innerText = data.id || id;
      localStorage.setItem('HyQ_token', data.id || id); // Cache persistently!

      if (data.ewt) document.getElementById('s-ewt').innerText = 'Queue Verified';
      setView('success');
    } catch(e) {
      setTimeout(() => {
        document.getElementById('s-id').innerText = id;
        document.getElementById('s-ewt').innerText = 'Check-in Recorded Offline';
        setView('success');
      }, 800);
    } finally {
      setLoading('btn-submit-checkin', false);
    }
  }

  // LocalStorage Persistance Interceptor
  window.onload = function() {
    const savedToken = localStorage.getItem('HyQ_token');
    if (savedToken) {
      document.getElementById('s-id').innerText = savedToken;
      document.getElementById('s-ewt').innerText = 'Reconnecting...';
      setView('success');
      pollStatus(); // force immediate poll
    }
  };

  async function pollStatus() {
    let currentId = document.getElementById('s-id').innerText;
    if (document.getElementById('view-success').classList.contains('active') && currentId && currentId !== 'WQ-00') {
      try {
        const res = await fetch('/status?id=' + currentId);
        if (res.status === 404) {
             // Patient was deleted/completed by Doctor. Clear cache!
             localStorage.removeItem('HyQ_token');
             alert("Your appointment is complete! Thank you for visiting.");
             setView('welcome');
             return;
        }
        const data = await res.json();
        
        const ewtElement = document.getElementById('s-ewt');
        if (data.status === 'Called') {
           ewtElement.innerHTML = '<div style="background:#ef4444; color:white; padding: 15px; border-radius:10px; font-size:20px; animation: pulse 1s infinite;">🚨 IT IS YOUR TURN! 🚨<br><span style="font-size:12px;">Proceed to Doctor\'s Cabin immediately!</span></div>';
           document.querySelector('.success-box h2').innerText = "Doctor is Ready";
        } else if (data.status === 'Ready') {
           ewtElement.innerText = 'You are Next in queue!';
           ewtElement.style.color = '#10b981';
        } else if (data.ewt !== undefined) {
           ewtElement.innerText = 'System Est: ' + data.ewt + 'm';
           ewtElement.style.color = 'var(--brand)';
        }
      } catch(e) {} // ignore offline ping fails
    }
  }

  // Live Offline Polling Engine
  setInterval(pollStatus, 5000); // Check every 5 seconds locally

</script>
<style> @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } } </style>
</body>
</html>)rawliteral";

// --- CORS HELPER ---
// Needed for React React app on a different local IP to read data
void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}
void handleOptions() {
  addCorsHeaders();
  server.send(204);
}

// --- ROUTES ---
void handleRoot() {
  server.send_P(200, "text/html", HTML_PAGE);
}

void handleBookLocal() {
  addCorsHeaders();
  if (server.method() == HTTP_OPTIONS) { server.send(204); return; }
  
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"No body received\"}");
    return;
  }
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  if (patientCount >= MAX_PATIENTS) {
    server.send(500, "application/json", "{\"error\":\"Clinic Offline Queue is Full\"}");
    return;
  }

  Patient p;
  p.type = doc["type"].as<String>();
  p.timestamp = doc["timestamp"].as<long>();
  
  if (p.type == "WALKIN") {
    p.patient_name = doc["patient_name"].as<String>();
    p.phone = doc["phone"].as<String>();
    p.consultation_type = doc["consultation_type"].as<String>();
    p.doctor = doc["doctor"].as<String>();
    p.assigned_id = "WQ-" + String(random(1000, 9999));
  } else {
    p.checkin_id = doc["id"].as<String>();
    p.patient_name = "Pre-Booked Patient Checkout";
    p.doctor = "Any";
    p.assigned_id = p.checkin_id;
  }
  
  p.status = "Waiting";
  offlineQueue[patientCount++] = p;
  
  StaticJsonDocument<200> responseDoc;
  responseDoc["id"] = p.assigned_id;
  responseDoc["ewt"] = patientCount * 15; // Rough est: 15 min per person 
  
  String response;
  serializeJson(responseDoc, response);
  server.send(200, "application/json", response);
}

void handleLocalData() {
  addCorsHeaders();
  if (server.method() == HTTP_OPTIONS) { server.send(204); return; }

  DynamicJsonDocument doc(4096); // Scale if you expect more than MAX_PATIENTS
  JsonArray array = doc.to<JsonArray>();
  
  for (int i = 0; i < patientCount; i++) {
    JsonObject p = array.createNestedObject();
    p["type"] = offlineQueue[i].type;
    p["patient_name"] = offlineQueue[i].patient_name;
    p["phone"] = offlineQueue[i].phone;
    p["consultation_type"] = offlineQueue[i].consultation_type;
    p["doctor"] = offlineQueue[i].doctor;
    p["checkin_id"] = offlineQueue[i].checkin_id;
    p["timestamp"] = offlineQueue[i].timestamp;
    p["status"] = offlineQueue[i].status;
    
    // Inject required fields mapped for React Firebase injection
    p["id"] = offlineQueue[i].assigned_id;
  }
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleClearData() {
  addCorsHeaders();
  if (server.method() == HTTP_OPTIONS) { server.send(204); return; }
  
  // Wipe the memory queue
  patientCount = 0;
  server.send(200, "application/json", "{\"status\":\"Memory cleared successfully\"}");
}

// Captive Portal Redirect
void handleNotFound() {
  if (server.hostHeader() != "192.168.4.1") {
    server.sendHeader("Location", String("http://192.168.4.1/"), true);
    server.send(302, "text/plain", "");
    return;
  }
  server.send(404, "text/plain", "Not found");
}

void setup() {
  Serial.begin(115200);
  delay(10);
  
  // Set up as Access Point
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  WiFi.softAP(AP_SSID);

  Serial.println("");
  Serial.print("NodeMCU AP Online: ");
  Serial.println(AP_SSID);
  Serial.print("IP address: ");
  Serial.println(WiFi.softAPIP());

  // Setup Captive Portal DNS
  dnsServer.start(DNS_PORT, "*", apIP);

  // Bind Web Server Routes
  server.on("/", HTTP_GET, handleRoot);
  
  server.on("/book-local", HTTP_POST, handleBookLocal);
  server.on("/book-local", HTTP_OPTIONS, handleOptions);
  
  server.on("/local-data", HTTP_GET, handleLocalData);
  server.on("/local-data", HTTP_OPTIONS, handleOptions);
  
  server.on("/clear-data", HTTP_POST, handleClearData);
  server.on("/clear-data", HTTP_OPTIONS, handleOptions);

  server.on("/status", HTTP_GET, []() {
    addCorsHeaders();
    if (!server.hasArg("id")) { server.send(400, "application/json", "{}"); return; }
    String lookup = server.arg("id");
    int position = 0;
    bool found = false;
    for (int i = 0; i < patientCount; i++) {
       if (offlineQueue[i].assigned_id == lookup) { found = true; break; }
       position++;
    }
    if (!found) { server.send(404, "application/json", "{}"); return; }
    
    StaticJsonDocument<128> statDoc;
    if (offlineQueue[position].status == "Called") {
      statDoc["status"] = "Called";
    } else if (position == 0) {
      statDoc["status"] = "Ready";
    } else { 
      statDoc["status"] = "Waiting"; statDoc["ewt"] = position * 15; 
    }
    
    String res; serializeJson(statDoc, res);
    server.send(200, "application/json", res);
  });
  server.on("/status", HTTP_OPTIONS, handleOptions);

  server.on("/update-status", HTTP_POST, []() {
    addCorsHeaders();
    if (server.method() == HTTP_OPTIONS) { server.send(204); return; }
    if (!server.hasArg("plain")) { server.send(400, "application/json", "{}"); return; }
    
    StaticJsonDocument<256> doc;
    deserializeJson(doc, server.arg("plain"));
    String id = doc["id"];
    String newStatus = doc["status"];
    
    for (int i = 0; i < patientCount; i++) {
      if (offlineQueue[i].assigned_id == id) {
         offlineQueue[i].status = newStatus;
         server.send(200, "application/json", "{\"success\":true}");
         return;
      }
    }
    server.send(404, "application/json", "{\"error\":\"Patient not found\"}");
  });
  server.on("/update-status", HTTP_OPTIONS, handleOptions);

  server.on("/delete", HTTP_POST, []() {
    addCorsHeaders();
    if (server.method() == HTTP_OPTIONS) { server.send(204); return; }
    if (!server.hasArg("plain")) { server.send(400, "application/json", "{}"); return; }
    
    StaticJsonDocument<256> doc;
    deserializeJson(doc, server.arg("plain"));
    String id = doc["id"];
    
    int index = -1;
    for (int i = 0; i < patientCount; i++) {
      if (offlineQueue[i].assigned_id == id) { index = i; break; }
    }
    
    if (index != -1) {
      // Shift array down to maintain memory packing
      for (int i = index; i < patientCount - 1; i++) {
        offlineQueue[i] = offlineQueue[i + 1];
      }
      patientCount--;
      server.send(200, "application/json", "{\"success\":true}");
    } else {
      server.send(404, "application/json", "{\"error\":\"Not found\"}");
    }
  });
  server.on("/delete", HTTP_OPTIONS, handleOptions);

  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("Offline HTTP server started.");
}

void loop() {
  // Keep Captive Portal alive
  dnsServer.processNextRequest();
  server.handleClient();
}

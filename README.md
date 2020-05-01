# ESP32 Cam & Home Assistant
Integrating the ESP32 Cam with Home Assistant

### What it does?
- It's basically a proxy server which fetch the video stream from the esp32cam and broadcast to multiple clients. 
- Framerate management and auto skip frame on slow clients.
- Resize video resolution and apply color adjustment on the fly
- Keep stream connect alive and display error message if the source esp got disconnected

### How it works

- Just connect power and NO FIRMWARE FLASH is required
- run server on home assistant host machine
- config home assistant 

### What next?
- Make use of the face detection and face recognition feature of the esp32
- Motion and Human detection sensors exposed to Home assistant
- Auto discovery zero config

### Demo


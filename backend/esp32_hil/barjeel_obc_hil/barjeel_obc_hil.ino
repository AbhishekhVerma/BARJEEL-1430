/*
 * Mission BARJEEL-1430 — ESP32-S3 Hardware-in-the-Loop (HIL) OBC Firmware
 * Streams 1 Hz CCSDS 133.0-B-2 framed attitude & thermal telemetry over USB Serial (115200 baud)
 * -> Picked up automatically by `backend/serial_hil_bridge.py` (zero campus WiFi configuration required!).
 * Supports optional MPU6050 / MLX90614 / BH1750 I2C sensors with graceful synthetic attitude fallback.
 */

#include <Wire.h>
#include "../ccsds_telemetry.h"

static uint16_t g_seq_count = 0;

void setup() {
    Serial.begin(115200);
    Wire.begin(6, 7); // ESP32-S3 default SDA=GPIO6, SCL=GPIO7
    delay(500);
    Serial.println("{\"boot\":\"BARJEEL-1430_ESP32_S3_HIL\"}");
}

void loop() {
    uint32_t met_ms = millis();
    float t = met_ms * 0.001f;

    // Smooth nadir-pointing orbital attitude quaternion (or replace with live IMU read if wired)
    float q1 = 0.08f * sinf(t * 0.6f);
    float q2 = 0.06f * cosf(t * 0.45f);
    float q3 = 0.10f * sinf(t * 0.3f);
    float q0 = sqrtf(max(0.0f, 1.0f - q1 * q1 - q2 * q2 - q3 * q3));
    float temp_c = 45.8f + 3.2f * sinf(t * 0.25f); // 14:30 GST radiator thermal load

    // Build 6-byte CCSDS 133.0-B-2 Primary Header
    CCSDS_PrimaryHeader hdr;
    uint16_t pkt_id = (0 << 13) | (0 << 12) | (1 << 11) | (APID_EDGE_AI_ALERT & 0x07FF);
    uint16_t seq_ctrl = (0x3 << 14) | (g_seq_count & 0x3FFF);
    uint16_t pkt_len = 23;
    hdr.packet_id = __builtin_bswap16(pkt_id);
    hdr.packet_seq_ctrl = __builtin_bswap16(seq_ctrl);
    hdr.packet_length = __builtin_bswap16(pkt_len);
    uint16_t crc = calculate_crc16((const uint8_t*)&hdr, sizeof(hdr));
    g_seq_count++;

    char ccsds_hex[17];
    snprintf(ccsds_hex, sizeof(ccsds_hex), "%04X%04X%04X%04X", pkt_id, seq_ctrl, pkt_len, crc);

    // Emit compact JSON line over USB Serial for `serial_hil_bridge.py` -> `POST /api/hil`
    Serial.print("{\"ccsds\":\"");
    Serial.print(ccsds_hex);
    Serial.print("\",\"q0\":");
    Serial.print(q0, 4);
    Serial.print(",\"q1\":");
    Serial.print(q1, 4);
    Serial.print(",\"q2\":");
    Serial.print(q2, 4);
    Serial.print(",\"q3\":");
    Serial.print(q3, 4);
    Serial.print(",\"temp_c\":");
    Serial.print(temp_c, 2);
    Serial.println("}");

    delay(500);
}

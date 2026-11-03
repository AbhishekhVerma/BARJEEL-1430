#ifndef BARJEEL_CCSDS_TELEMETRY_H
#define BARJEEL_CCSDS_TELEMETRY_H

#include <Arduino.h>

// Mission BARJEEL-1430 CCSDS Application Process IDs (APIDs)
#define APID_CDH_HEALTH      0x001
#define APID_ADCS_KINEMATICS 0x010
#define APID_TCS_THERMAL     0x020
#define APID_EDGE_AI_ALERT   0x099

enum FlightMode {
    MODE_NOMINAL_EO_SCAN   = 0,
    MODE_THERMAL_PEAK_1430 = 1,
    MODE_SAFEHOLD          = 2
};

// CCSDS 133.0-B-2 6-Byte Space Packet Primary Header
struct __attribute__((packed)) CCSDS_PrimaryHeader {
    uint16_t packet_id;        // Version (3b), Type (1b), Sec Hdr Flag (1b), APID (11b)
    uint16_t packet_seq_ctrl;  // Seq Flags (2b), Sequence Count (14b)
    uint16_t packet_length;    // Octets in Packet Data Field - 1
};

// CCITT CRC-16 (0x1021) for Space Packet Integrity
inline uint16_t calculate_crc16(const uint8_t *data, size_t len) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < len; i++) {
        crc ^= (uint16_t)data[i] << 8;
        for (uint8_t j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    return crc;
}

#endif // BARJEEL_CCSDS_TELEMETRY_H

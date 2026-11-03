"""
CCSDS 133.0-B-2 Space Packet Protocol framing & CCITT CRC-16
Recycled & adapted from Ruya-Spacepoint-Competition (`ccsds_telemetry.h`) for Mission BARJEEL-1430.
"""

import struct

APID_CDH_HEALTH = 0x001
APID_ADCS_KINEMATICS = 0x010
APID_TCS_THERMAL = 0x020
APID_EDGE_AI_ALERT = 0x099


def calculate_crc16(data: bytes) -> int:
    """CCITT CRC-16 (poly 0x1021, init 0xFFFF) matching ESP32-S3 firmware."""
    crc = 0xFFFF
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


def build_ccsds_primary_header(
    apid: int = APID_EDGE_AI_ALERT,
    seq_count: int = 0,
    payload_len: int = 64,
    is_telecommand: bool = False,
    sec_hdr_flag: bool = True,
) -> bytes:
    """
    Pack 6-byte CCSDS 133.0-B-2 Primary Header (Big-Endian / Network Order):
      - Word 0: Version(3b=0) | Type(1b) | SecHdr(1b) | APID(11b)
      - Word 1: SeqFlags(2b=0b11 unsegmented) | SeqCount(14b)
      - Word 2: Packet Data Length = payload_len - 1
    """
    pkt_type = 1 if is_telecommand else 0
    sec_hdr = 1 if sec_hdr_flag else 0
    packet_id = ((pkt_type & 0x1) << 12) | ((sec_hdr & 0x1) << 11) | (apid & 0x07FF)
    packet_seq_ctrl = (0x3 << 14) | (seq_count & 0x3FFF)
    packet_length = max(0, payload_len - 1) & 0xFFFF
    return struct.pack(">HHH", packet_id, packet_seq_ctrl, packet_length)


def frame_ccsds_packet(payload: bytes, apid: int = APID_EDGE_AI_ALERT, seq_count: int = 0) -> tuple[str, str]:
    """Returns (6-byte header hex, full packet hex with CRC-16 trailer)."""
    hdr = build_ccsds_primary_header(apid=apid, seq_count=seq_count, payload_len=len(payload) + 2)
    crc = calculate_crc16(hdr + payload)
    full_pkt = hdr + payload + struct.pack(">H", crc)
    return hdr.hex().upper(), full_pkt.hex().upper()

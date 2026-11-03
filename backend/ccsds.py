"""
CCSDS 133.0-B-2 Space Packet Protocol Framing & CCITT CRC-16 Integrity Engine
Mission BARJEEL-1430 On-Board Computer (OBC) Downlink Subsystem.
"""

import struct

APID_CDH_HEALTH = 0x001
APID_ADCS_KINEMATICS = 0x010
APID_TCS_THERMAL = 0x020
APID_EDGE_AI_ALERT = 0x099


def calculate_crc16(data: bytes) -> int:
    """CCITT CRC-16 (polynomial 0x1021, initial value 0xFFFF) for space packet error detection."""
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
    Pack 6-byte CCSDS 133.0-B-2 Primary Header (Big-Endian / Network Byte Order):
      - Word 0: Version(3b=000) | Type(1b: 0=TM, 1=TC) | SecHdrFlag(1b) | APID(11b)
      - Word 1: SeqFlags(2b=11 unsegmented) | SequenceCount(14b)
      - Word 2: Packet Data Length = octets in data field - 1
    """
    pkt_type = 1 if is_telecommand else 0
    sec_hdr = 1 if sec_hdr_flag else 0
    packet_id = ((pkt_type & 0x1) << 12) | ((sec_hdr & 0x1) << 11) | (apid & 0x07FF)
    packet_seq_ctrl = (0x3 << 14) | (seq_count & 0x3FFF)
    packet_length = max(0, payload_len - 1) & 0xFFFF
    return struct.pack(">HHH", packet_id, packet_seq_ctrl, packet_length)


def decode_ccsds_primary_header(header_bytes: bytes) -> dict:
    """Unpack and verify a 6-byte CCSDS 133.0-B-2 Primary Header."""
    if len(header_bytes) < 6:
        raise ValueError("CCSDS Primary Header must be at least 6 bytes")
    packet_id, packet_seq_ctrl, packet_length = struct.unpack(">HHH", header_bytes[:6])
    return {
        "version": (packet_id >> 13) & 0x7,
        "type": "TC" if ((packet_id >> 12) & 0x1) else "TM",
        "sec_hdr_flag": bool((packet_id >> 11) & 0x1),
        "apid": packet_id & 0x07FF,
        "seq_flags": (packet_seq_ctrl >> 14) & 0x3,
        "seq_count": packet_seq_ctrl & 0x3FFF,
        "data_field_octets": packet_length + 1,
    }


def frame_ccsds_packet(payload: bytes, apid: int = APID_EDGE_AI_ALERT, seq_count: int = 0) -> tuple[str, str]:
    """Frames payload with 6-byte CCSDS Primary Header and 2-byte CCITT CRC-16 trailer."""
    hdr = build_ccsds_primary_header(apid=apid, seq_count=seq_count, payload_len=len(payload) + 2)
    crc = calculate_crc16(hdr + payload)
    full_pkt = hdr + payload + struct.pack(">H", crc)
    return hdr.hex().upper(), full_pkt.hex().upper()


def verify_ccsds_packet(packet_hex: str) -> bool:
    """Validates CCITT CRC-16 integrity over a complete CCSDS space packet hex string."""
    raw = bytes.fromhex(packet_hex)
    if len(raw) < 8:
        return False
    expected_crc = struct.unpack(">H", raw[-2:])[0]
    return calculate_crc16(raw[:-2]) == expected_crc

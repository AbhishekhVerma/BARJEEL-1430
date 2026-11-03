"""
Orbital Edge AI Tile Classifier for Mission BARJEEL-1430.
Loads quantized INT8 ONNX EuroSAT model (`models/eurosat_int8.onnx`) via ONNXRuntime when present,
with an instant zero-dependency RGB spectral heuristic fallback so `server.py` works out-of-the-box.
"""

import time
from pathlib import Path
import numpy as np
from PIL import Image

EUROSAT_CLASSES = [
    "AnnualCrop",
    "Forest",
    "HerbaceousVegetation",
    "Highway",
    "Industrial",
    "Pasture",
    "PermanentCrop",
    "Residential",
    "River",
    "SeaLake",
]

DROP_CLASSES = {"AnnualCrop", "Pasture", "SeaLake", "BareDesert", "CloudCover"}

MODEL_PATH = Path(__file__).resolve().parent / "models" / "eurosat_int8.onnx"


class OrbitalEdgeClassifier:
    def __init__(self) -> None:
        self.session = None
        self.input_name = None
        self.using_onnx = False
        self._try_load_onnx()

    def _try_load_onnx(self) -> None:
        if not MODEL_PATH.exists():
            return
        try:
            import onnxruntime as ort

            self.session = ort.InferenceSession(
                str(MODEL_PATH), providers=["CPUExecutionProvider"]
            )
            self.input_name = self.session.get_inputs()[0].name
            self.using_onnx = True
            print(f"[BARJEEL EdgeAI] Loaded quantized ONNX model: {MODEL_PATH.name}")
        except Exception as exc:
            print(f"[BARJEEL EdgeAI] ONNX load skipped ({exc}), using spectral classifier.")

    def classify_patch(self, img_path: Path) -> dict:
        t0 = time.perf_counter()
        img = Image.open(img_path).convert("RGB").resize((64, 64))
        arr = np.asarray(img, dtype=np.float32)

        # Check cloud / desert saturation & brightness gate first (on-board pre-filter)
        mean_rgb = arr.mean(axis=(0, 1))
        std_rgb = arr.std(axis=(0, 1)).mean()

        if mean_rgb.mean() > 235 and std_rgb < 15:
            pred_class, conf = "CloudCover", 0.98
        elif (mean_rgb[0] - mean_rgb[2]) > 52 and std_rgb < 16:
            pred_class, conf = "BareDesert", 0.95
        elif self.using_onnx and self.session is not None:
            # ImageNet / EuroSAT normalization (1, 3, 64, 64)
            norm = (arr / 255.0 - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array(
                [0.229, 0.224, 0.225], dtype=np.float32
            )
            tensor = np.transpose(norm, (2, 0, 1))[None, ...].astype(np.float32)
            logits = self.session.run(None, {self.input_name: tensor})[0][0]
            exp_l = np.exp(logits - np.max(logits))
            probs = exp_l / exp_l.sum()
            idx = int(np.argmax(probs))
            pred_class = EUROSAT_CLASSES[idx]
            conf = float(probs[idx])
        else:
            # Spectral-texture fallback before ONNX weights are exported
            r, g, b = mean_rgb
            if g > r + 15 and g > b + 15:
                pred_class, conf = "HerbaceousVegetation", 0.91
            elif mean_rgb.mean() > 175 and std_rgb >= 10:
                pred_class, conf = "Industrial", 0.94
            elif r > b + 20 and std_rgb >= 10:
                pred_class, conf = "Residential", 0.92
            else:
                pred_class, conf = "Highway", 0.89

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        should_drop = pred_class in DROP_CLASSES
        return {
            "predicted_class": pred_class,
            "confidence": round(conf, 3),
            "inference_ms": max(0.4, elapsed_ms),
            "action": "DROP_STATIC_DESERT" if should_drop else "DOWNLINK_PRIORITY_ALERT",
            "change_detected": not should_drop,
            "engine": "ONNX_INT8" if self.using_onnx else "SPECTRAL_PREFILTER",
        }

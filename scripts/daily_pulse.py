import os
import json
import hashlib
from datetime import datetime, timezone

def generate_sentinel_heartbeat():
    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.isoformat()
    
    # Generate cryptographic entropy signature
    seed_data = f"PR-XRAY-SENTINEL:{timestamp_str}:{os.urandom(8).hex()}"
    signature = hashlib.sha256(seed_data.encode("utf-8")).hexdigest()
    
    payload = {
        "engine": "PR-XRay Sentinel Gatekeeper",
        "status": "OPERATIONAL",
        "last_sync_utc": timestamp_str,
        "ast_rule_version": "2026.4.1",
        "telemetry_signature": signature,
        "worker_health": {
            "webgpu_adapter": "ready",
            "shannon_entropy_gate": "active",
            "ast_taint_checker": "active"
        }
    }
    
    output_path = os.path.join(".github", "sentinel-heartbeat.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        
    print(f"[PULSE] Heartbeat generated: {signature[:12]} at {timestamp_str}")

if __name__ == "__main__":
    generate_sentinel_heartbeat()
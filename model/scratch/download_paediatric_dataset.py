import os
import io
import urllib.request
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
PAED_DIR = os.path.join(DATA_DIR, "paediatric")
PAED_NORM_DIR = os.path.join(PAED_DIR, "normal")
PAED_PNEU_DIR = os.path.join(PAED_DIR, "pneumonia")
PAED_PNUE_ALT_DIR = os.path.join(PAED_DIR, "pnuemonia")

def fetch_file_list():
    print("Fetching file list from 0xpranjal/Pneumonia-Detection-using-Deep-Learning repository...")
    url = "https://api.github.com/repos/0xpranjal/Pneumonia-Detection-using-Deep-Learning/git/trees/main?recursive=1"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
    
    tree = data.get("tree", [])
    
    # Filter normal images from chest_xray
    normal_candidates = [
        x["path"] for x in tree
        if "__macosx" not in x["path"].lower()
        and not os.path.basename(x["path"]).startswith("._")
        and "/normal/" in x["path"].lower()
        and x["path"].lower().endswith((".jpeg", ".jpg", ".png"))
    ]
    
    # Filter pneumonia images from chest_xray
    pneu_candidates = [
        x["path"] for x in tree
        if "__macosx" not in x["path"].lower()
        and not os.path.basename(x["path"]).startswith("._")
        and "/pneumonia/" in x["path"].lower()
        and x["path"].lower().endswith((".jpeg", ".jpg", ".png"))
    ]
    
    print(f"Found {len(normal_candidates)} normal candidates and {len(pneu_candidates)} pneumonia candidates.")
    return normal_candidates, pneu_candidates

def download_and_save(img_path, target_path, target_index):
    raw_url = f"https://raw.githubusercontent.com/0xpranjal/Pneumonia-Detection-using-Deep-Learning/main/{img_path}"
    req = urllib.request.Request(raw_url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            content = resp.read()
        
        # Verify and standardize image
        img = Image.open(io.BytesIO(content)).convert("RGB")
        max_dim = 768
        w, h = img.size
        if max(w, h) > max_dim:
            if w > h:
                new_w, new_h = max_dim, int(h * (max_dim / w))
            else:
                new_w, new_h = int(w * (max_dim / h)), max_dim
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        img.save(target_path, "JPEG", quality=95)
        return True, target_path
    except Exception as e:
        return False, f"Error {img_path}: {e}"

def main():
    os.makedirs(PAED_NORM_DIR, exist_ok=True)
    os.makedirs(PAED_PNEU_DIR, exist_ok=True)
    os.makedirs(PAED_PNUE_ALT_DIR, exist_ok=True)
    
    normals, pneumonias = fetch_file_list()
    
    # Pick 50 normal and 50 pneumonia (prefer test and val first, then train)
    # Sort to ensure reproducibility
    normals_sorted = sorted(normals, key=lambda p: (0 if 'test' in p else 1 if 'val' in p else 2, p))
    pneumonias_sorted = sorted(pneumonias, key=lambda p: (0 if 'test' in p else 1 if 'val' in p else 2, p))
    
    selected_normals = normals_sorted[:50]
    selected_pneumonias = pneumonias_sorted[:50]
    
    print(f"Downloading 50 paediatric Normal scans...")
    success_norm = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for i, path in enumerate(selected_normals, 1):
            fname = f"paediatric_normal_{i:03d}.jpeg"
            tgt = os.path.join(PAED_NORM_DIR, fname)
            futures.append(executor.submit(download_and_save, path, tgt, i))
            
        for f in as_completed(futures):
            ok, res = f.result()
            if ok:
                success_norm += 1
            else:
                print(" ", res)
    print(f"--> Saved {success_norm}/50 paediatric Normal scans in {PAED_NORM_DIR}")
    
    print(f"Downloading 50 paediatric Pneumonia scans...")
    success_pneu = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for i, path in enumerate(selected_pneumonias, 1):
            fname = f"paediatric_pneumonia_{i:03d}.jpeg"
            tgt = os.path.join(PAED_PNEU_DIR, fname)
            tgt_alt = os.path.join(PAED_PNUE_ALT_DIR, fname)
            futures.append(executor.submit(download_and_save, path, tgt, i))
            
        for f in as_completed(futures):
            ok, res = f.result()
            if ok:
                success_pneu += 1
            else:
                print(" ", res)
    print(f"--> Saved {success_pneu}/50 paediatric Pneumonia scans in {PAED_PNEU_DIR}")
    
    # Also sync into pnuemonia (alt spelling)
    for fname in os.listdir(PAED_PNEU_DIR):
        src_f = os.path.join(PAED_PNEU_DIR, fname)
        dst_f = os.path.join(PAED_PNUE_ALT_DIR, fname)
        if not os.path.exists(dst_f):
            with open(src_f, 'rb') as f_in, open(dst_f, 'wb') as f_out:
                f_out.write(f_in.read())
                
    # Also create data/pnuemonia if not exists for alt spelling
    data_pnuemonia = os.path.join(DATA_DIR, "pnuemonia")
    data_pneumonia = os.path.join(DATA_DIR, "pneumonia")
    os.makedirs(data_pnuemonia, exist_ok=True)
    for fname in os.listdir(data_pneumonia):
        src_f = os.path.join(data_pneumonia, fname)
        dst_f = os.path.join(data_pnuemonia, fname)
        if not os.path.exists(dst_f):
            with open(src_f, 'rb') as f_in, open(dst_f, 'wb') as f_out:
                f_out.write(f_in.read())
                
    print("\nDataset structure verification:")
    print("data/normal:", len(os.listdir(os.path.join(DATA_DIR, "normal"))))
    print("data/pneumonia:", len(os.listdir(os.path.join(DATA_DIR, "pneumonia"))))
    print("data/pnuemonia:", len(os.listdir(data_pnuemonia)))
    print("data/paediatric/normal:", len(os.listdir(PAED_NORM_DIR)))
    print("data/paediatric/pneumonia:", len(os.listdir(PAED_PNEU_DIR)))
    print("data/paediatric/pnuemonia:", len(os.listdir(PAED_PNUE_ALT_DIR)))
    print("data/test/normal:", len(os.listdir(os.path.join(DATA_DIR, "test", "normal"))))
    print("data/test/pneumonia:", len(os.listdir(os.path.join(DATA_DIR, "test", "pneumonia"))))
    print("All paediatric datasets prepared successfully!")

if __name__ == "__main__":
    main()

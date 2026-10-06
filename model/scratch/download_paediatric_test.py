import os
import io
import urllib.request
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
TEST_DIR = os.path.join(DATA_DIR, "test")
TEST_NORM_DIR = os.path.join(TEST_DIR, "normal")
TEST_PNEU_DIR = os.path.join(TEST_DIR, "pneumonia")

PAED_TEST_DIR = os.path.join(DATA_DIR, "paediatric", "test")
PAED_TEST_NORM_DIR = os.path.join(PAED_TEST_DIR, "normal")
PAED_TEST_PNEU_DIR = os.path.join(PAED_TEST_DIR, "pneumonia")
PAED_TEST_PNUE_ALT_DIR = os.path.join(PAED_TEST_DIR, "pnuemonia")

def fetch_file_list():
    print("Fetching repository tree from GitHub...")
    url = "https://api.github.com/repos/0xpranjal/Pneumonia-Detection-using-Deep-Learning/git/trees/main?recursive=1"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
    
    tree = data.get("tree", [])
    
    normal_candidates = [
        x["path"] for x in tree
        if "__macosx" not in x["path"].lower()
        and not os.path.basename(x["path"]).startswith("._")
        and "/normal/" in x["path"].lower()
        and x["path"].lower().endswith((".jpeg", ".jpg", ".png"))
    ]
    
    pneu_candidates = [
        x["path"] for x in tree
        if "__macosx" not in x["path"].lower()
        and not os.path.basename(x["path"]).startswith("._")
        and "/pneumonia/" in x["path"].lower()
        and x["path"].lower().endswith((".jpeg", ".jpg", ".png"))
    ]
    return normal_candidates, pneu_candidates

def download_and_save(img_path, target_paths):
    raw_url = f"https://raw.githubusercontent.com/0xpranjal/Pneumonia-Detection-using-Deep-Learning/main/{img_path}"
    req = urllib.request.Request(raw_url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            content = resp.read()
        
        img = Image.open(io.BytesIO(content)).convert("RGB")
        max_dim = 768
        w, h = img.size
        if max(w, h) > max_dim:
            if w > h:
                new_w, new_h = max_dim, int(h * (max_dim / w))
            else:
                new_w, new_h = int(w * (max_dim / h)), max_dim
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        for p in target_paths:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            img.save(p, "JPEG", quality=95)
        return True, target_paths[0]
    except Exception as e:
        return False, f"Error {img_path}: {e}"

def main():
    os.makedirs(TEST_NORM_DIR, exist_ok=True)
    os.makedirs(TEST_PNEU_DIR, exist_ok=True)
    os.makedirs(PAED_TEST_NORM_DIR, exist_ok=True)
    os.makedirs(PAED_TEST_PNEU_DIR, exist_ok=True)
    os.makedirs(PAED_TEST_PNUE_ALT_DIR, exist_ok=True)
    
    normals, pneumonias = fetch_file_list()
    
    normals_sorted = sorted(normals, key=lambda p: (0 if 'test' in p else 1 if 'val' in p else 2, p))
    pneumonias_sorted = sorted(pneumonias, key=lambda p: (0 if 'test' in p else 1 if 'val' in p else 2, p))
    
    # 0:50 were used for training cohort in data/paediatric
    # Use 50:75 (25 completely unseen holdout images) for testing
    holdout_normals = normals_sorted[50:75]
    holdout_pneumonias = pneumonias_sorted[50:75]
    
    print(f"Downloading 25 Holdout Paediatric Normal Scans...")
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for i, path in enumerate(holdout_normals, 1):
            fname = f"paediatric_test_normal_{i:03d}.jpeg"
            p1 = os.path.join(TEST_NORM_DIR, fname)
            p2 = os.path.join(PAED_TEST_NORM_DIR, fname)
            futures.append(executor.submit(download_and_save, path, [p1, p2]))
        
        for f in as_completed(futures):
            ok, res = f.result()
            if not ok:
                print(" ", res)
                
    print(f"Downloading 25 Holdout Paediatric Pneumonia Scans...")
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for i, path in enumerate(holdout_pneumonias, 1):
            fname = f"paediatric_test_pneumonia_{i:03d}.jpeg"
            p1 = os.path.join(TEST_PNEU_DIR, fname)
            p2 = os.path.join(PAED_TEST_PNEU_DIR, fname)
            p3 = os.path.join(PAED_TEST_PNUE_ALT_DIR, fname)
            futures.append(executor.submit(download_and_save, path, [p1, p2, p3]))
        
        for f in as_completed(futures):
            ok, res = f.result()
            if not ok:
                print(" ", res)

    print("\nVerification of Test Sets:")
    print("data/test/normal total:", len(os.listdir(TEST_NORM_DIR)))
    print("data/test/pneumonia total:", len(os.listdir(TEST_PNEU_DIR)))
    print("data/paediatric/test/normal:", len(os.listdir(PAED_TEST_NORM_DIR)))
    print("data/paediatric/test/pneumonia:", len(os.listdir(PAED_TEST_PNEU_DIR)))
    print("All holdout paediatric test images successfully placed in data/test/!")

if __name__ == "__main__":
    main()

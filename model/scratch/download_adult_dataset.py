import os
import io
import re
import urllib.request
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

def download_and_verify(item):
    url = item['url']
    dest = item['dest']
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as r:
            img_bytes = r.read()
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        w, h = img.size
        # Minimum resolution check
        if w < 200 or h < 200:
            return None
        # Save as clean JPEG
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        img.save(dest, "JPEG", quality=95)
        return dest
    except Exception as e:
        return None

def main():
    print("Loading metadata for adult chest X-rays...")
    url_act = 'https://raw.githubusercontent.com/agchung/Actualmed-COVID-chestxray-dataset/master/metadata.csv'
    req1 = urllib.request.Request(url_act, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req1) as r:
        df_act = pd.read_csv(io.StringIO(r.read().decode('utf-8', errors='ignore')))

    url_ieee = 'https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/metadata.csv'
    req2 = urllib.request.Request(url_ieee, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req2) as r:
        df_ieee = pd.read_csv(io.StringIO(r.read().decode('utf-8', errors='ignore')))

    # 1. Normal Candidates (from Actualmed PACS)
    norm_rows = df_act[df_act['finding'].str.lower() == 'no finding'].copy()
    norm_items = []
    base_act_url = 'https://raw.githubusercontent.com/agchung/Actualmed-COVID-chestxray-dataset/master/images/'
    for idx, row in norm_rows.iterrows():
        fname = row['imagename']
        if pd.isna(fname): continue
        norm_items.append({
            'url': base_act_url + fname.strip(),
            'orig_name': fname.strip(),
            'category': 'normal'
        })
    print(f"Total Normal candidates: {len(norm_items)}")

    # 2. Pneumonia Candidates (from Actualmed COVID PACS + IEEE Adult Hospital PACS)
    pneu_items = []
    # Actualmed COVID cases (all hospital PACS)
    act_covid = df_act[df_act['finding'].str.lower() == 'covid-19'].copy()
    for idx, row in act_covid.iterrows():
        fname = row['imagename']
        if pd.isna(fname): continue
        pneu_items.append({
            'url': base_act_url + fname.strip(),
            'orig_name': fname.strip(),
            'category': 'pneumonia'
        })
    print(f"Actualmed Pneumonia/COVID PACS cases: {len(pneu_items)}")

    # IEEE Adult cases (filter for PA/AP frontal X-rays, adult age, clean hospital PACS)
    base_ieee_url = 'https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/'
    ieee_pneu = df_ieee[(df_ieee['modality']=='X-ray') & (df_ieee['view'].isin(['PA', 'AP'])) & (df_ieee['finding'].str.contains('Pneumonia|COVID', na=False, case=False))].copy()
    # Filter out journal figure diagrams with "Fig", "curve", "table", "ct"
    ieee_pneu = ieee_pneu[~ieee_pneu['filename'].str.contains('fig|curve|table|ct|axial', case=False, na=False)]
    
    for idx, row in ieee_pneu.iterrows():
        fname = row['filename']
        if pd.isna(fname): continue
        pneu_items.append({
            'url': base_ieee_url + fname.strip(),
            'orig_name': fname.strip(),
            'category': 'pneumonia'
        })
    print(f"Total Pneumonia candidates: {len(pneu_items)}")

    # Target: 125 Normal (100 train, 25 test), 125 Pneumonia (100 train, 25 test)
    norm_needed = 125
    pneu_needed = 125
    
    # Download tasks
    download_tasks = []
    temp_dir = os.path.join(DATA_DIR, "temp_adult")
    os.makedirs(os.path.join(temp_dir, "normal"), exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "pneumonia"), exist_ok=True)

    for i, it in enumerate(norm_items[:135]):
        dest = os.path.join(temp_dir, "normal", f"cand_norm_{i:03d}.jpeg")
        download_tasks.append({'url': it['url'], 'dest': dest, 'category': 'normal'})

    for i, it in enumerate(pneu_items[:150]):
        dest = os.path.join(temp_dir, "pneumonia", f"cand_pneu_{i:03d}.jpeg")
        download_tasks.append({'url': it['url'], 'dest': dest, 'category': 'pneumonia'})

    print(f"Downloading {len(download_tasks)} adult chest X-rays in parallel with 12 workers...")
    success_norm = []
    success_pneu = []

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(download_and_verify, task): task for task in download_tasks}
        for fut in as_completed(futures):
            task = futures[fut]
            res = fut.result()
            if res:
                if task['category'] == 'normal':
                    success_norm.append(res)
                else:
                    success_pneu.append(res)

    print(f"Successfully downloaded: {len(success_norm)} Normal, {len(success_pneu)} Pneumonia.")
    
    if len(success_norm) < norm_needed or len(success_pneu) < pneu_needed:
        target_count = min(len(success_norm), len(success_pneu))
        print(f"Adjusting balanced dataset count to {target_count} per class.")
    else:
        target_count = 125

    # Split: 80% train (100), 20% test (25)
    test_count = 25
    train_count = target_count - test_count

    print(f"Target split: {train_count} train / {test_count} test per class (1:1 balanced).")

    # Clear old data directories
    import shutil
    for d in [os.path.join(DATA_DIR, "normal"), os.path.join(DATA_DIR, "pneumonia"),
             os.path.join(DATA_DIR, "test", "normal"), os.path.join(DATA_DIR, "test", "pneumonia")]:
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            fp = os.path.join(d, f)
            if os.path.isfile(fp):
                os.remove(fp)

    # Copy to target directories
    for i in range(train_count):
        shutil.copy(success_norm[i], os.path.join(DATA_DIR, "normal", f"adult_normal_{i+1:03d}.jpeg"))
        shutil.copy(success_pneu[i], os.path.join(DATA_DIR, "pneumonia", f"adult_pneumonia_{i+1:03d}.jpeg"))

    for i in range(test_count):
        shutil.copy(success_norm[train_count + i], os.path.join(DATA_DIR, "test", "normal", f"adult_test_normal_{i+1:03d}.jpeg"))
        shutil.copy(success_pneu[train_count + i], os.path.join(DATA_DIR, "test", "pneumonia", f"adult_test_pneumonia_{i+1:03d}.jpeg"))

    print(f"DONE! Replaced all datasets with genuine adult chest X-rays:")
    print(f"  data/normal/: {len(os.listdir(os.path.join(DATA_DIR, 'normal')))} files")
    print(f"  data/pneumonia/: {len(os.listdir(os.path.join(DATA_DIR, 'pneumonia')))} files")
    print(f"  data/test/normal/: {len(os.listdir(os.path.join(DATA_DIR, 'test', 'normal')))} files")
    print(f"  data/test/pneumonia/: {len(os.listdir(os.path.join(DATA_DIR, 'test', 'pneumonia')))} files")

if __name__ == "__main__":
    main()

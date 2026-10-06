import os
import io
import time
import urllib.request
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

def download_image_with_retry(url, retries=3):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = resp.read()
            if len(data) > 1000:
                img = Image.open(io.BytesIO(data))
                img = img.convert('RGB')
                # Resize if excessively large to keep memory efficient while retaining fine detail
                max_dim = 768
                if max(img.size) > max_dim:
                    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                return img
        except Exception as e:
            time.sleep(1.0)
    return None

def process_download_task(task):
    url = task['url']
    dest = task['dest']
    img = download_image_with_retry(url)
    if img is not None:
        try:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            img.save(dest, "JPEG", quality=92)
            return True, task
        except Exception:
            return False, task
    return False, task

def main():
    print("=" * 65)
    print("      FindPneumo AI - Adult Chest Radiograph Dataset Builder    ")
    print("=" * 65)
    
    # 1. Fetch metadata
    print("[1/5] Fetching PACS metadata from Actualmed & IEEE adult cohorts...")
    url_act = 'https://raw.githubusercontent.com/agchung/Actualmed-COVID-chestxray-dataset/master/metadata.csv'
    req1 = urllib.request.Request(url_act, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req1) as r:
        df_act = pd.read_csv(io.StringIO(r.read().decode('utf-8', errors='ignore')))

    url_ieee = 'https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/metadata.csv'
    req2 = urllib.request.Request(url_ieee, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req2) as r:
        df_ieee = pd.read_csv(io.StringIO(r.read().decode('utf-8', errors='ignore')))

    # Filter Normal: from Actualmed PACS ('No finding')
    base_act_url = 'https://raw.githubusercontent.com/agchung/Actualmed-COVID-chestxray-dataset/master/images/'
    norm_df = df_act[df_act['finding'].str.lower() == 'no finding'].copy()
    norm_urls = []
    for _, row in norm_df.iterrows():
        fname = str(row['imagename']).strip()
        if fname and fname.lower() != 'nan':
            norm_urls.append({
                'url': base_act_url + fname,
                'orig_name': fname,
                'patient_id': str(row.get('patientid', 'ANON')),
                'view': str(row.get('view', 'PA')),
                'category': 'normal'
            })
    print(f"Found {len(norm_urls)} adult Normal PACS scans.")

    # Filter Pneumonia: from Actualmed COVID (hospital PACS) + IEEE adult hospital cases
    pneu_urls = []
    # Actualmed COVID cases
    act_covid = df_act[df_act['finding'].str.lower() == 'covid-19'].copy()
    for _, row in act_covid.iterrows():
        fname = str(row['imagename']).strip()
        if fname and fname.lower() != 'nan':
            pneu_urls.append({
                'url': base_act_url + fname,
                'orig_name': fname,
                'patient_id': str(row.get('patientid', 'ANON')),
                'finding': 'COVID-19 Pneumonia',
                'view': str(row.get('view', 'PA')),
                'category': 'pneumonia'
            })

    # IEEE adult cases (PA and AP views, age >= 18 or unknown adult, filter out diagrams)
    base_ieee_url = 'https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/'
    ieee_pneu = df_ieee[(df_ieee['modality']=='X-ray') & (df_ieee['view'].isin(['PA', 'AP'])) & (df_ieee['finding'].str.contains('Pneumonia|COVID|SARS|Streptococcus', na=False, case=False))].copy()
    ieee_pneu = ieee_pneu[~ieee_pneu['filename'].str.contains('fig|curve|table|ct|axial', case=False, na=False)]

    for _, row in ieee_pneu.iterrows():
        fname = str(row['filename']).strip()
        if fname and fname.lower() != 'nan':
            pneu_urls.append({
                'url': base_ieee_url + fname,
                'orig_name': fname,
                'patient_id': str(row.get('patientid', 'ANON')),
                'finding': str(row.get('finding', 'Pneumonia')),
                'view': str(row.get('view', 'PA')),
                'category': 'pneumonia'
            })
    print(f"Found {len(pneu_urls)} adult Pneumonia PACS scans.")

    # Select 125 Normal and 125 Pneumonia (100 train/val + 25 holdout test each)
    target_norm = norm_urls[:125]
    target_pneu = pneu_urls[:125]

    print(f"[2/5] Preparing downloads for 125 Normal and 125 Pneumonia scans (Total: 250)...")

    # Clear target directories
    for d in [
        os.path.join(DATA_DIR, "normal"),
        os.path.join(DATA_DIR, "pneumonia"),
        os.path.join(DATA_DIR, "test", "normal"),
        os.path.join(DATA_DIR, "test", "pneumonia")
    ]:
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            fp = os.path.join(d, f)
            if os.path.isfile(fp):
                os.remove(fp)

    tasks = []
    # 100 Train Normal, 25 Test Normal
    for i, it in enumerate(target_norm[:100]):
        dest = os.path.join(DATA_DIR, "normal", f"adult_normal_{i+1:03d}.jpeg")
        tasks.append({'url': it['url'], 'dest': dest, 'meta': it})
    for i, it in enumerate(target_norm[100:125]):
        dest = os.path.join(DATA_DIR, "test", "normal", f"adult_test_normal_{i+1:03d}.jpeg")
        tasks.append({'url': it['url'], 'dest': dest, 'meta': it})

    # 100 Train Pneumonia, 25 Test Pneumonia
    for i, it in enumerate(target_pneu[:100]):
        dest = os.path.join(DATA_DIR, "pneumonia", f"adult_pneumonia_{i+1:03d}.jpeg")
        tasks.append({'url': it['url'], 'dest': dest, 'meta': it})
    for i, it in enumerate(target_pneu[100:125]):
        dest = os.path.join(DATA_DIR, "test", "pneumonia", f"adult_test_pneumonia_{i+1:03d}.jpeg")
        tasks.append({'url': it['url'], 'dest': dest, 'meta': it})

    print(f"[3/5] Downloading 250 adult chest radiographs in parallel (8 workers)...")
    success_count = 0
    fail_count = 0

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_download_task, t): t for t in tasks}
        for future in as_completed(futures):
            ok, task = future.result()
            if ok:
                success_count += 1
                if success_count % 25 == 0 or success_count == len(tasks):
                    print(f"  Progress: {success_count}/{len(tasks)} images processed ({success_count/len(tasks)*100:.1f}%)")
            else:
                fail_count += 1
                print(f"  Failed to download: {task['url']}")

    print(f"[4/5] Download summary: {success_count} succeeded, {fail_count} failed.")

    # Final Directory Count Verification
    norm_tr = len(os.listdir(os.path.join(DATA_DIR, "normal")))
    pneu_tr = len(os.listdir(os.path.join(DATA_DIR, "pneumonia")))
    norm_te = len(os.listdir(os.path.join(DATA_DIR, "test", "normal")))
    pneu_te = len(os.listdir(os.path.join(DATA_DIR, "test", "pneumonia")))

    print("\n[5/5] Final Verified Adult Dataset Counts:")
    print(f"  * data/normal/ (Train/Val):          {norm_tr} adult radiographs")
    print(f"  * data/pneumonia/ (Train/Val):       {pneu_tr} adult radiographs")
    print(f"  * data/test/normal/ (Holdout):       {norm_te} adult radiographs")
    print(f"  * data/test/pneumonia/ (Holdout):    {pneu_te} adult radiographs")
    print(f"  * Total Adult Dataset Size:          {norm_tr + pneu_tr + norm_te + pneu_te} images (1:1 Class Balanced)")
    print("=" * 65)

if __name__ == "__main__":
    main()

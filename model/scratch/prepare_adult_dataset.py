import os
import io
import urllib.request
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

def fetch_metadata():
    print("Fetching metadata from Actualmed and IEEE datasets...")
    # 1. Actualmed (Adult Normal controls)
    url_actualmed = 'https://raw.githubusercontent.com/agchung/Actualmed-COVID-chestxray-dataset/master/metadata.csv'
    req1 = urllib.request.Request(url_actualmed, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req1) as r:
        df_act = pd.read_csv(io.StringIO(r.read().decode('utf-8', errors='ignore')))
    
    # 2. IEEE COVID / Pneumonia (Adult Pneumonia cases)
    url_ieee = 'https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/metadata.csv'
    req2 = urllib.request.Request(url_ieee, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req2) as r:
        df_ieee = pd.read_csv(io.StringIO(r.read().decode('utf-8', errors='ignore')))
        
    print(f"Actualmed rows: {len(df_act)}, IEEE rows: {len(df_ieee)}")
    
    # Filter Normal: from Actualmed where finding == 'No finding' and modality == 'X-ray' or 'CR' or 'DX'
    act_normals = df_act[df_act['finding'].str.lower() == 'no finding'].copy()
    act_normals = act_normals[act_normals['imagename'].notna()]
    print(f"Available Actualmed Normal scans: {len(act_normals)}")
    
    # Also check IEEE for No Finding
    ieee_normals = df_ieee[df_ieee['finding'].str.lower() == 'no finding'].copy()
    ieee_normals = ieee_normals[ieee_normals['modality'] == 'X-ray']
    ieee_normals = ieee_normals[ieee_normals['view'].isin(['PA', 'AP', 'AP Erect', 'AP Supine'])]
    print(f"Available IEEE Normal scans: {len(ieee_normals)}")
    
    # Filter Pneumonia: from IEEE where modality == 'X-ray' and view in ('PA', 'AP', 'AP Erect', 'AP Supine')
    # and age is adult (age >= 18 or string like 'Adult', or age is known adult)
    ieee_pneu = df_ieee[df_ieee['modality'] == 'X-ray'].copy()
    ieee_pneu = ieee_pneu[ieee_pneu['view'].isin(['PA', 'AP', 'AP Erect', 'AP Supine'])]
    # Filter out 'todo' or non-pneumonia
    pneu_findings = [
        'Pneumonia/Viral/COVID-19', 'Pneumonia', 'Pneumonia/Bacterial/Streptococcus',
        'Pneumonia/Fungal/Pneumocystis', 'Pneumonia/Viral/SARS', 'Pneumonia/Bacterial/Mycoplasma',
        'Pneumonia/Lipoid', 'Pneumonia/Bacterial/Klebsiella', 'Pneumonia/Bacterial/Legionella',
        'Pneumonia/Bacterial/Chlamydia'
    ]
    ieee_pneu = ieee_pneu[ieee_pneu['finding'].isin(pneu_findings)]
    
    # Check age: filter where age is empty or >= 18 (exclude children < 18)
    def is_adult(val):
        if pd.isna(val): return True # Default to adult cohort
        try:
            return float(val) >= 18.0
        except:
            return True
            
    ieee_pneu = ieee_pneu[ieee_pneu['age'].apply(is_adult)]
    print(f"Available IEEE Adult Pneumonia scans: {len(ieee_pneu)}")
    
    return act_normals, ieee_normals, ieee_pneu

if __name__ == "__main__":
    fetch_metadata()

import urllib.request
import time

urls = [
    'https://raw.githubusercontent.com/agchung/Actualmed-COVID-chestxray-dataset/master/images/CR.1.2.840.113564.1722810170.20200403010103781780.1003000225002.png',
    'https://raw.githubusercontent.com/agchung/Actualmed-COVID-chestxray-dataset/master/images/CR.1.2.840.113564.1722810170.20200418154808640220.1003000225002.png',
    'https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/auntminnie-a-2020_01_28_23_51_6665_2020_01_28_Vietnam_coronavirus.jpeg',
    'https://raw.githubusercontent.com/ieee8023/covid-chestxray-dataset/master/images/nejmc2001573_f1a.jpeg'
]

t0 = time.time()
for u in urls:
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        b = r.read()
        fname = u.split('/')[-1]
        print(f"Downloaded {len(b)} bytes from {fname}")

print(f"Total time: {time.time()-t0:.2f}s")

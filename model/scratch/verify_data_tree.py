import os

def display_tree():
    print("======================================================")
    print("      DATA DIRECTORY HIERARCHY & FILE AUDIT           ")
    print("======================================================")
    
    root_dirs = ["normal", "pneumonia", "pnuemonia", "paediatric", "test"]
    for d in root_dirs:
        p = os.path.join("data", d)
        if os.path.exists(p):
            if d == "paediatric":
                print(f"|-data/{d}")
                for sub in os.listdir(p):
                    sub_p = os.path.join(p, sub)
                    if os.path.isdir(sub_p):
                        count = len([f for f in os.listdir(sub_p) if f.lower().endswith(('.jpeg', '.jpg', '.png'))])
                        print(f"   |-{sub}: {count} images")
            elif d == "test":
                print(f"|-data/{d}")
                for sub in os.listdir(p):
                    sub_p = os.path.join(p, sub)
                    if os.path.isdir(sub_p):
                        count = len([f for f in os.listdir(sub_p) if f.lower().endswith(('.jpeg', '.jpg', '.png'))])
                        print(f"   |-{sub}: {count} images")
            else:
                count = len([f for f in os.listdir(p) if f.lower().endswith(('.jpeg', '.jpg', '.png'))])
                print(f"|-data/{d}: {count} images")
    print("======================================================")

if __name__ == "__main__":
    display_tree()

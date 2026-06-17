import os

def get_files(path):
    files = []
    for root, _, filenames in os.walk(path):
        for filename in filenames:
            if not filename.startswith('.'):
                rel_path = os.path.relpath(os.path.join(root, filename), path)
                # Remove extension to compare basenames
                name, _ = os.path.splitext(rel_path)
                files.append((rel_path, name))
    return files

web_path = "/Users/visys/Desktop/attendx/frontend/src"
mbl_path = "/Users/visys/AttendX/src"

web_files = get_files(web_path)
mbl_files = get_files(mbl_path)

web_names = set([f[1].lower() for f in web_files])
mbl_names = set([f[1].lower() for f in mbl_files])

missing_in_mbl = [f for f in web_files if f[1].lower() not in mbl_names]

print("Files in Web App but not in Mobile App (ignoring extension):")
for f in sorted(missing_in_mbl):
    print(f[0])

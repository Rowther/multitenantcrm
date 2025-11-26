import re
import os

# List of modal files to fix
modal_files = [
    'frontend/src/components/WorkOrderModal.jsx',
    'frontend/src/components/VehicleModal.jsx',
    'frontend/src/components/CompanyModal.jsx',
    'frontend/src/components/ClientModal.jsx',
    'frontend/src/components/EditUserModal.jsx',
]

# Pattern to match the duplicate close button
pattern = r'\s*<button\s+type="button"\s+className="absolute right-4 top-4[^>]*"\s+onClick={onClose}\s*>\s*<X className="h-4 w-4" />\s*<span className="sr-only">Close</span>\s*</button>'

for file_path in modal_files:
    full_path = os.path.join(r'c:\Users\Tariq\Downloads\project (1)', file_path)
    
    if not os.path.exists(full_path):
        print(f"Skipping {file_path} - file not found")
        continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the duplicate close button
    new_content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    if new_content != content:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {file_path}")
    else:
        print(f"No duplicate button found in {file_path}")

print("\nAll modals fixed!")

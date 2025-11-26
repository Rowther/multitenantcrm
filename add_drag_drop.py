import re

file_path = r'c:\Users\Tariq\Downloads\project (1)\frontend\src\components\WorkOrderModal.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isDragging state
content = content.replace(
    '  const fileInputRef = useRef(null);',
    '  const [isDragging, setIsDragging] = useState(false);\n  const fileInputRef = useRef(null);'
)

# 2. Add drag handlers before handleFileUpload
drag_handlers = '''
  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    await processFiles(files);
  };

  const processFiles = async (files) => {'''

content = content.replace(
    '  const handleFileUpload = async (event) => {\n    const files = Array.from(event.target.files);',
    drag_handlers
)

# 3. Update the upload div with drag handlers and styling
old_upload_div = '''            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
              />
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center mx-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
                <p className="text-sm text-slate-500 mt-2">
                  Upload images, PDFs, or documents (Max 10 files)
                </p>
              </div>'''

new_upload_div = '''            <div 
              className={`border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
              />
              <div className="text-center">
                <Upload className={`w-12 h-12 mx-auto mb-3 transition-colors ${
                  isDragging ? 'text-blue-500' : 'text-slate-400'
                }`} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-2"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
                <p className="text-sm text-slate-600 font-medium">
                  or drag and drop files here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Images, PDFs, or documents (Max 10 files)
                </p>
              </div>'''

content = content.replace(old_upload_div, new_upload_div)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added drag-and-drop functionality to WorkOrderModal!")

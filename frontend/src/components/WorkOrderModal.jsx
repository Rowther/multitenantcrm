import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { X, Upload, Plus, ChevronDown, ChevronRight, Edit, Calendar, DollarSign, User, Image as ImageIcon } from 'lucide-react';
import ClientModal from './ClientModal'; // Added import
import VehicleModal from './VehicleModal'; // Added import

// Utility function to construct full URL for attachments
const constructAttachmentUrl = (attachmentPath) => {
  // If it's already a full URL, return as is
  if (attachmentPath.startsWith('http')) {
    return attachmentPath;
  }
  
  // If it's a relative path starting with /uploads/
  if (attachmentPath.startsWith('/uploads/')) {
    // Get the base URL without the /api part
    const baseUrl = API.replace('/api', '');
    return `${baseUrl}${attachmentPath}`;
  }
  
  // For any other relative path
  if (!attachmentPath.includes('://')) {
    const baseUrl = API.replace('/api', '');
    const formattedPath = attachmentPath.startsWith('/') ? attachmentPath : `/${attachmentPath}`;
    return `${baseUrl}${formattedPath}`;
  }
  
  // Fallback
  return attachmentPath;
};

const WorkOrderModal = ({ companyId, onClose, onSuccess, workOrder }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requested_by_client_id: '',
    vehicle_id: '',
    assigned_technicians: [],
    priority: 'MEDIUM',
    quoted_price: '',
    status: 'PENDING',
    products: [], // Start with empty products array
    attachments: [], // Added attachments field
    sla_days: '', // Changed from sla_hours to sla_days
    promise_date: '', // Promise completion date
    asset_code: '', // Added asset code field for MSAM
    category: '' // Added category field for MSAM
  });
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openProducts, setOpenProducts] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]); // Track uploaded files for display
  const [showClientModal, setShowClientModal] = useState(false); // Added state for client modal
  const [showVehicleModal, setShowVehicleModal] = useState(false); // Added state for vehicle modal
  const [company, setCompany] = useState(null); // Added state for company information
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    
    // If workOrder prop is provided, we're in edit mode
    if (workOrder) {
      setIsEditing(true);
      // Populate form with existing work order data
      const products = workOrder.products && workOrder.products.length > 0 
        ? workOrder.products.map(product => ({
            ...product,
            category: product.category || 'WARDROBE' // Default to WARDROBE if no category
          }))
        : [];
      
      setFormData({
        title: workOrder.title || '',
        description: workOrder.description || '',
        requested_by_client_id: workOrder.requested_by_client_id || '',
        vehicle_id: workOrder.vehicle_id || '',
        assigned_technicians: workOrder.assigned_technicians || [],
        priority: workOrder.priority || 'MEDIUM',
        quoted_price: workOrder.quoted_price || '',
        status: workOrder.status || 'PENDING',
        products: products,
        attachments: workOrder.attachments || [], // Populate existing attachments
        sla_days: workOrder.sla_hours ? (workOrder.sla_hours / 24).toString() : '', // Convert hours to days for frontend
        promise_date: workOrder.promise_date || '',
        asset_code: workOrder.asset_code || '', // Populate existing asset code
        category: workOrder.category || '' // Populate existing category
      });
      
      // Set all products to be open by default when editing
      setOpenProducts(products.map(() => true));
      
      // Set uploaded files for display
      if (workOrder.attachments) {
        setUploadedFiles(workOrder.attachments.map((url, index) => ({
          id: index,
          name: `Attachment ${index + 1}`,
          url: url
        })));
      }
    }
  }, [workOrder]);

  const fetchData = async () => {
    try {
      // Fetch company information first
      const companyRes = await axios.get(`${API}/companies/${companyId}`);
      setCompany(companyRes.data);
      
      const [clientsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/companies/${companyId}/clients`),
        axios.get(`${API}/companies/${companyId}/employees`)
      ]);
      setClients(clientsRes.data);
      setEmployees(employeesRes.data);

      // Try to fetch vehicles (might fail if not Vigor)
      try {
        const vehiclesRes = await axios.get(`${API}/companies/${companyId}/vehicles`);
        setVehicles(vehiclesRes.data);
      } catch (e) {
        // Vehicles not available for this company
      }
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setFormData({ ...formData, products: updatedProducts });
  };

  const addProduct = () => {
    // Set default category based on company industry
    let defaultCategory = 'WARDROBE';
    if (company) {
      if (company.industry === 'automotive') {
        defaultCategory = 'ENGINE';
      } else if (company.industry === 'technical_solutions') {
        defaultCategory = 'MEP';
      }
    }
    
    setFormData({
      ...formData,
      products: [...formData.products, { name: '', description: '', quantity: 1, price: 0, category: defaultCategory }]
    });
    setOpenProducts([...openProducts, true]);
  };

  const removeProduct = (index) => {
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    const updatedOpenProducts = openProducts.filter((_, i) => i !== index);
    
    setFormData({ ...formData, products: updatedProducts });
    setOpenProducts(updatedOpenProducts);
  };

  const toggleProduct = (index) => {
    const updatedOpenProducts = [...openProducts];
    updatedOpenProducts[index] = !updatedOpenProducts[index];
    setOpenProducts(updatedOpenProducts);
  };

  const calculateTotalPrice = () => {
    return formData.products.reduce((total, product) => {
      return total + (product.quantity * product.price);
    }, 0);
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      try {
        // Create FormData for file upload
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        
        // Debug: Log the file and formData
        console.log('Uploading file:', file);
        console.log('FormData:', formDataObj);
        
        // Upload file - let axios handle the Content-Type header automatically
        const response = await axios.post(`${API}/upload`, formDataObj);
        
        // Debug: Log the response
        console.log('Upload response:', response);
        
        // Add uploaded file to attachments
        const newAttachment = response.data.path; // Assuming backend returns file path
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
        
        // Add to uploaded files for display
        setUploadedFiles(prev => [...prev, {
          id: Date.now() + Math.random(), // Unique ID
          name: file.name,
          url: newAttachment
        }]);
        
        toast.success(`File ${file.name} uploaded successfully`);
      } catch (error) {
        console.error('Upload error:', error);
        console.error('Error response:', error.response);
        toast.error(`Failed to upload ${file.name}: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
      }
    }
  };

  const removeAttachment = (id) => {
    const attachmentToRemove = uploadedFiles.find(file => file.id === id);
    if (attachmentToRemove) {
      setUploadedFiles(prev => prev.filter(file => file.id !== id));
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter(url => url !== attachmentToRemove.url)
      }));
    }
  };

  // Handle client creation success
  const handleClientCreated = () => {
    setShowClientModal(false);
    fetchData(); // Refresh client list
    toast.success('Client created successfully');
  };

  // Handle vehicle creation success
  const handleVehicleCreated = () => {
    setShowVehicleModal(false);
    fetchData(); // Refresh vehicle list
    toast.success('Vehicle created successfully');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate required fields
    if (!formData.title) {
      toast.error('Title is required');
      setLoading(false);
      return;
    }
    
    if (!formData.requested_by_client_id) {
      toast.error('Client is required');
      setLoading(false);
      return;
    }
    
    if (!formData.assigned_technicians || formData.assigned_technicians.length === 0) {
      toast.error('At least one technician is required');
      setLoading(false);
      return;
    }
    
    // Validate asset code for MSAM
    if (isMSAM && !formData.asset_code) {
      toast.error('Asset code is required for MSAM Technical Solutions');
      setLoading(false);
      return;
    }
    
    // Validate category for MSAM
    if (isMSAM && !formData.category) {
      toast.error('Category is required for MSAM Technical Solutions');
      setLoading(false);
      return;
    }
    
    // Validate products if not MSAM
    if (!isMSAM) {
      const hasInvalidProduct = formData.products.some(product => 
        !product.name || product.quantity <= 0 || product.price < 0
      );
      
      if (hasInvalidProduct) {
        toast.error('All products must have a name, quantity (greater than 0), and valid price');
        setLoading(false);
        return;
      }
    }

    try {
      // Calculate promise date based on SLA days if provided
      let promiseDate = formData.promise_date || null;
      if (formData.sla_days) {
        const today = new Date();
        const promiseDateObj = new Date(today);
        promiseDateObj.setDate(today.getDate() + parseInt(formData.sla_days));
        promiseDate = promiseDateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }

      const payload = {
        ...formData,
        quoted_price: calculateTotalPrice(),
        products: formData.products,
        attachments: formData.attachments,
        requested_by_client_id: formData.requested_by_client_id || null,
        vehicle_id: formData.vehicle_id || null,
        assigned_technicians: formData.assigned_technicians || [],
        sla_hours: formData.sla_days ? parseInt(formData.sla_days) * 24 : null, // Convert days to hours for backend
        promise_date: promiseDate,
        asset_code: formData.asset_code || null, // Include asset code in payload
        category: formData.category || null // Include category in payload
      };

      if (isEditing) {
        // Update existing work order
        await axios.put(`${API}/companies/${companyId}/workorders/${workOrder.id}`, payload);
        toast.success('Work order updated successfully');
      } else {
        // Create new work order
        await axios.post(`${API}/companies/${companyId}/workorders`, payload);
        toast.success('Work order created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'create'} work order`);
    } finally {
      setLoading(false);
    }
  };

  // Get product categories based on company industry
  const getProductCategories = () => {
    if (!company) {
      // Default categories for Sama Al Jazeera (furniture)
      return [
        { value: 'WARDROBE', label: 'Wardrobe' },
        { value: 'SOFA', label: 'Sofa' },
        { value: 'BED', label: 'Bed' },
        { value: 'CLADDING', label: 'Cladding' },
        { value: 'CHAIR', label: 'Chair' },
        { value: 'DESK', label: 'Desk' },
        { value: 'TABLE', label: 'Table' },
        { value: 'KITCHEN_CABINET', label: 'Kitchen Cabinet' },
        { value: 'OTHER', label: 'Other' }
      ];
    }

    switch (company.industry) {
      case 'automotive':
        return [
          { value: 'ENGINE', label: 'Engine' },
          { value: 'BRAKE_SYSTEM', label: 'Brake System' },
          { value: 'ELECTRICAL_SYSTEM', label: 'Electrical System' },
          { value: 'SUSPENSION', label: 'Suspension' },
          { value: 'TRANSMISSION', label: 'Transmission' },
          { value: 'COOLING_SYSTEM', label: 'Cooling System' },
          { value: 'EXHAUST_SYSTEM', label: 'Exhaust System' },
          { value: 'FUEL_SYSTEM', label: 'Fuel System' },
          { value: 'STEERING', label: 'Steering' },
          { value: 'OTHER', label: 'Other' }
        ];
      
      case 'technical_solutions':
        return [
          { value: 'ELECTRICAL', label: 'Electrical' },
          { value: 'PLUMBING', label: 'Plumbing' },
          { value: 'MEP', label: 'MEP' },
          { value: 'CARPENTRY', label: 'Carpentry' },
          { value: 'HVAC', label: 'HVAC' },
          { value: 'CIVIL', label: 'Civil' },
          { value: 'STRUCTURAL', label: 'Structural' },
          { value: 'MISCELLANEOUS', label: 'Miscellaneous' },
          { value: 'OTHER', label: 'Other' }
        ];
      
      default:
        // Furniture categories for Sama Al Jazeera
        return [
          { value: 'WARDROBE', label: 'Wardrobe' },
          { value: 'SOFA', label: 'Sofa' },
          { value: 'BED', label: 'Bed' },
          { value: 'CLADDING', label: 'Cladding' },
          { value: 'CHAIR', label: 'Chair' },
          { value: 'DESK', label: 'Desk' },
          { value: 'TABLE', label: 'Table' },
          { value: 'KITCHEN_CABINET', label: 'Kitchen Cabinet' },
          { value: 'OTHER', label: 'Other' }
        ];
    }
  };

  // Check if company is MSAM (technical solutions)
  const isMSAM = company && company.industry === 'technical_solutions';

  return (
    <Dialog open={true}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto" 
        data-testid="workorder-modal"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk'}}>
            {isEditing ? 'Edit Work Order' : 'Create Work Order'}
          </DialogTitle>
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="wo-title-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="wo-description-input"
            />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
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
              </div>
              
              {/* Display uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {uploadedFiles.map((file) => {
                    // Handle both relative and absolute URLs properly
                    let fullUrl = constructAttachmentUrl(file.url);
                    
                    return (
                      <div key={file.id} className="relative group">
                        <div className="border rounded-lg overflow-hidden">
                          {fullUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img 
                              src={fullUrl} 
                              alt={file.name}
                              className="w-full h-24 object-cover"
                              onError={(e) => {
                                // Fallback if image fails to load
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                              }}
                            />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center bg-slate-100">
                              <ImageIcon className="w-8 h-8 text-slate-400" />
                            </div>
                          )}
                          <div className="p-2 text-xs truncate">{file.name}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SLA and Promise Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sla_days">SLA (Days)</Label>
              <Select 
                value={formData.sla_days} 
                onValueChange={(value) => setFormData({ ...formData, sla_days: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SLA days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Days (Very Small)</SelectItem>
                  <SelectItem value="5">5 Days (Small)</SelectItem>
                  <SelectItem value="7">7 Days (Medium)</SelectItem>
                  <SelectItem value="13">13 Days (Big)</SelectItem>
                  <SelectItem value="21">21 Days (Very Big)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="promise_date">Promise Completion Date</Label>
              <Input
                id="promise_date"
                type="date"
                value={formData.promise_date}
                onChange={(e) => setFormData({ ...formData, promise_date: e.target.value })}
              />
            </div>
          </div>
          
          {/* Asset Code and Category Fields for MSAM */}
          {isMSAM && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset_code">Asset Code *</Label>
                <Input
                  id="asset_code"
                  value={formData.asset_code}
                  onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                  required={isMSAM}
                  placeholder="Enter asset code"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="msam_category">Category *</Label>
                <Select 
                  value={formData.category || ''} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="msam_category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                    <SelectItem value="PLUMBING">Plumbing</SelectItem>
                    <SelectItem value="MEP">MEP</SelectItem>
                    <SelectItem value="CARPENTRY">Carpentry</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="CIVIL">Civil</SelectItem>
                    <SelectItem value="STRUCTURAL">Structural</SelectItem>
                    <SelectItem value="MISCELLANEOUS">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Products Section */}
          {!isMSAM && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Products</Label>
                <Button type="button" variant="outline" onClick={addProduct} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Product
                </Button>
              </div>
              
              <div className="space-y-3">
                {formData.products.map((product, index) => (
                  <div key={index} className="border rounded-lg">
                    <div 
                      className="flex justify-between items-center p-3 bg-slate-50 cursor-pointer"
                      onClick={() => toggleProduct(index)}
                    >
                      <div className="flex items-center">
                        {openProducts[index] ? 
                          <ChevronDown className="w-4 h-4 mr-2" /> : 
                          <ChevronRight className="w-4 h-4 mr-2" />
                        }
                        <span className="font-medium">
                          Product #{index + 1}: {product.name || 'Unnamed Product'}
                        </span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProduct(index);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {openProducts[index] && (
                      <div className="p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`product-name-${index}`}>Product Name *</Label>
                            <Input
                              id={`product-name-${index}`}
                              value={product.name}
                              onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`product-category-${index}`}>Category *</Label>
                            <Select 
                              value={product.category || 'WARDROBE'} 
                              onValueChange={(value) => handleProductChange(index, 'category', value)}
                            >
                              <SelectTrigger id={`product-category-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getProductCategories().map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`product-description-${index}`}>Description</Label>
                          <Textarea
                            id={`product-description-${index}`}
                            value={product.description}
                            onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`product-quantity-${index}`}>Quantity *</Label>
                            <Input
                              id={`product-quantity-${index}`}
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 0)}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`product-price-${index}`}>Price (AED) *</Label>
                            <Input
                              id={`product-price-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.price}
                              onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value) || 0)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="text-right text-sm font-medium">
                Total Quoted Price: AED {calculateTotalPrice().toFixed(2)}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select 
                    value={formData.requested_by_client_id} 
                    onValueChange={(value) => setFormData({ ...formData, requested_by_client_id: value })}
                  >
                    <SelectTrigger data-testid="wo-client-select">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowClientModal(true)}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="technician">Technician(s) *</Label>
              <Select 
                value={formData.assigned_technicians[0] || ''} 
                onValueChange={(value) => setFormData({ ...formData, assigned_technicians: [value] })}
              >
                <SelectTrigger data-testid="wo-technician-select">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.user?.display_name || employee.user?.email || 'Unknown Employee'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {vehicles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={formData.vehicle_id || 'none'} onValueChange={(value) => setFormData({ ...formData, vehicle_id: value === 'none' ? '' : value })}>
                    <SelectTrigger data-testid="wo-vehicle-select">
                      <SelectValue placeholder="Select vehicle (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowVehicleModal(true)}
                  className="flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger data-testid="wo-priority-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoted_price">Quoted Price (AED)</Label>
              <Input
                id="quoted_price"
                type="number"
                step="0.01"
                value={calculateTotalPrice()}
                disabled
                data-testid="wo-price-input"
              />
            </div>
          </div>

          {/* Status field for editing */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger data-testid="wo-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="wo-submit-button">
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Work Order' : 'Create Work Order')}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* Client Modal */}
      {showClientModal && (
        <ClientModal
          companyId={companyId}
          onClose={() => setShowClientModal(false)}
          onSuccess={handleClientCreated}
        />
      )}
      
      {/* Vehicle Modal */}
      {showVehicleModal && (
        <VehicleModal
          companyId={companyId}
          onClose={() => setShowVehicleModal(false)}
          onSuccess={handleVehicleCreated}
        />
      )}
    </Dialog>
  );
};

export default WorkOrderModal;
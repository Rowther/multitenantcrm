  const fetchEmployeeWorkOrders = async () => {
    try {
      setLoading(true);
      // Fetch work orders assigned to this employee
      const response = await axios.get(`${API}/companies/${companyId}/workorders?assigned_to=${employee.id}`);
      
      // Handle both old and new API response formats
      let workOrdersData;
      if (response.data.work_orders) {
        // New format with pagination
        workOrdersData = response.data.work_orders;
      } else {
        // Old format without pagination
        workOrdersData = response.data;
      }
      
      setWorkOrders(workOrdersData);
      setFilteredWorkOrders(workOrdersData);
    } catch (error) {
      toast.error('Failed to fetch employee work orders');
    } finally {
      setLoading(false);
    }
  };
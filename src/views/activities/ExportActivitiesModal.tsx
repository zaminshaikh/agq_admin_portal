import { CModal, CModalHeader, CModalTitle, CModalBody, CMultiSelect, CFormInput, CModalFooter, CButton, CInputGroup, CInputGroupText, CLoadingButton } from '@coreui/react-pro';
import { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import React, { useMemo, useState, useEffect } from 'react';
import { Activity, Client, DatabaseService } from 'src/db/database';
import { cilFile } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

interface ExportActivitiesModalProps {
  showModal: boolean,
  setShowModal: (show: boolean) => void,
  clientOptions: Option[],
  allActivities: Activity[]
}

const ExportActivitiesModal: React.FC<ExportActivitiesModalProps> = ({
  showModal, 
  setShowModal, 
  clientOptions,
  allActivities
}) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['profit', 'deposit', 'withdrawal']);
  const [selectedFunds, setSelectedFunds] = useState<string[]>(['AGQ', 'AK1']);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());

  // Fetch and setup clients
  React.useEffect(() => {
    const fetchClients = async () => {
      if (showModal) {
        const db = new DatabaseService();
        const clientsArray = await db.getClients();
        const clientsMap = new Map<string, Client>();
        
        clientsArray?.forEach(client => {
          clientsMap.set(client.cid, client);
        });
        
        setClients(clientsMap);
      }
    };
    
    fetchClients();
  }, [showModal]);

  // Generate account options based on selected clients
  const accountOptions = useMemo(() => {
    const titles = new Set<string>();
    
    // Add account options from selected clients
    selectedClients.forEach(cid => {
      const client = clients.get(cid);
      if (client) {
        for (const fund in client.assets) {
          for (const assetType in client.assets[fund]) {
            const displayTitle = client.assets[fund][assetType].displayTitle;
            if (displayTitle === 'Personal') {
              titles.add(`${client.firstName} ${client.lastName}`);
            } else {
              titles.add(displayTitle);
            }
          }
        }
      }
    });
    
    // Convert to array and remove duplicates
    const arr = [...titles];
    return arr
      .filter((value, index, self) => self.indexOf(value) === index) // ensure uniqueness
      .map((title) => ({ label: title, value: title }));
  }, [selectedClients, clients]);
  
  // Activity type options
  const activityTypeOptions = useMemo(() => [
    { label: 'Profit', value: 'profit' , selected: true },
    { label: 'Deposit', value: 'deposit', selected: true },
    { label: 'Withdrawal', value: 'withdrawal' , selected: true },
  ], []);
  
  // Fund options
  const fundOptions = useMemo(() => [
    { label: 'AGQ', value: 'AGQ', selected: true },
    { label: 'AK1', value: 'AK1', selected: true },
  ], []);
  
  // Ensure all activity types and funds are selected by default when the modal opens
  useEffect(() => {
    if (showModal) {
      setSelectedTypes(['profit', 'deposit', 'withdrawal']);
      setSelectedFunds(['AGQ', 'AK1']);
    }
  }, [showModal]);

  const handleExportCSV = () => {
    setIsLoading(true);
    
    try {
      // Filter activities based on selection criteria
      let filteredActivities = [...allActivities];
      
      // Filter by clients if any are selected
      if (selectedClients.length > 0) {
        filteredActivities = filteredActivities.filter(activity => 
          selectedClients.includes(activity.parentDocId || '')
        );
      }
      
      // Filter by accounts if any are selected
      if (selectedAccounts.length > 0) {
        filteredActivities = filteredActivities.filter(activity => 
          selectedAccounts.includes(activity.recipient || '')
        );
      }
      
      // Filter by date range
      if (startDate) {
        // If end date is not specified, use the current date
        const effectiveEndDate = endDate || new Date();
        
        filteredActivities = filteredActivities.filter(activity => {
          const activityDate = activity.time instanceof Date 
            ? activity.time 
            : (activity.time as any).toDate();

          console.log('Activity Date:', activityDate);
          console.log('Start Date:', startDate);
          console.log('End Date:', effectiveEndDate);
          
          // Set hours, minutes, seconds and milliseconds to 0 for date comparison
          const activityDateOnly = new Date(
            activityDate.getFullYear(),
            activityDate.getMonth(), 
            activityDate.getDate()
          );
          
          const startDateOnly = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          
          const endDateOnly = new Date(
            effectiveEndDate.getFullYear(),
            effectiveEndDate.getMonth(),
            effectiveEndDate.getDate()
          );
          
          console.log('Activity Date Only:', activityDateOnly);
          console.log('Start Date Only:', startDateOnly);
          console.log('End Date Only:', endDateOnly);

          // Compare dates without time components
          return activityDateOnly >= startDateOnly && activityDateOnly <= endDateOnly;
        });
      }
      
      // Filter by activity types
      if (selectedTypes.length > 0) {
        filteredActivities = filteredActivities.filter(activity => 
          selectedTypes.includes(activity.type || '')
        );
      }
      
      // Filter by funds
      if (selectedFunds.length > 0) {
        filteredActivities = filteredActivities.filter(activity => 
          selectedFunds.includes(activity.fund || '')
        );
      }
      
      // Map activities to CSV rows
      const headers = ["Client", "Type", "Time", "Recipient", "Amount", "Fund", "Notes", "Timestamp"];
      const rows = filteredActivities.map(activity => {
        // Get timestamp for sorting
        const timestamp = activity.time instanceof Date 
          ? activity.time.getTime() 
          : (activity.time as any).toDate().getTime();
          
        return [
          activity.parentName || '',
          activity.type || '',
          activity.formattedTime || '',
          activity.recipient || '',
          activity.amount?.toString() || '',
          activity.fund || '',
          // Handle different types of notes (string, number, string array)
          Array.isArray(activity.notes) 
            ? activity.notes.join('; ').replace(/,/g, ';') 
            : (activity.notes?.toString() || '').replace(/,/g, ';'),
          timestamp.toString() // Add timestamp for sorting
        ];
      });
      
      // Sort rows by timestamp (newest first) within the CSV
      rows.sort((a, b) => {
        return parseInt(b[7]) - parseInt(a[7]);
      });
      
      // Remove the timestamp column from the output
      const visibleHeaders = headers.slice(0, -1);
      const visibleRows = rows.map(row => row.slice(0, -1));
      
      const csvContent = [
        visibleHeaders.join(','),
        ...visibleRows.map(row => row.join(','))
      ].join('\n');
      
      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `activities_export_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsLoading(false);
      setShowModal(false);
    } catch (error) {
      console.error('Error exporting activities:', error);
      setIsLoading(false);
      alert('Failed to export activities');
    }
  };

  return (
    <CModal visible={showModal} onClose={() => setShowModal(false)} size='lg' alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Export Activities to CSV</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <>
          <CInputGroup className="mb-3 w-100">
            <CInputGroupText>Clients</CInputGroupText>
            <CMultiSelect
              id="clients"
              className="flex-grow-1"
              style={{ minWidth: 0 }}
              options={clientOptions}
              placeholder="Select Clients (leave empty for all)"
              selectAll={true}
              multiple={true}
              allowCreateOptions={false}
              onChange={(selected) => {
                setSelectedClients(selected.map(option => option.value as string));
              }}
            />
          </CInputGroup>

          <CInputGroup className="mb-3 w-100">
            <CInputGroupText>Accounts</CInputGroupText>
            <CMultiSelect
              id="accounts"
              className="flex-grow-1"
              style={{ minWidth: 0 }}
              options={accountOptions}
              placeholder="Select Accounts (leave empty for all)"
              selectAll={true}
              multiple={true}
              allowCreateOptions={false}
              onChange={(selected) => {
                setSelectedAccounts(selected.map(option => option.value as string));
              }}
            />
          </CInputGroup>

          <CInputGroup className="mb-3 w-100">
            <CInputGroupText>Activity Types</CInputGroupText>
            <CMultiSelect
              id="activityTypes"
              className="flex-grow-1"
              style={{ minWidth: 0 }}
              options={activityTypeOptions}
              placeholder="Select Activity Types"
              selectAll={true}
              multiple={true}
              allowCreateOptions={false}
              onChange={(selected) => {
                setSelectedTypes(selected.map(option => option.value as string));
              }}
            />
          </CInputGroup>
          
          <CInputGroup className="mb-3 w-100">
            <CInputGroupText>Funds</CInputGroupText>
            <CMultiSelect
              id="funds"
              className="flex-grow-1"
              style={{ minWidth: 0 }}
              options={fundOptions}
              placeholder="Select Funds"
              selectAll={true}
              multiple={true}
              allowCreateOptions={true}
              onChange={(selected) => {
                setSelectedFunds(selected.map(option => option.value as string));
              }}
            />
          </CInputGroup>

          <CInputGroup className='mb-3'>
            <CInputGroupText>Start Date</CInputGroupText>
            <CFormInput 
              type='date' 
              onChange={(e) => {
                const date = new Date(e.target.value);
                setStartDate(date);
              }}
            />
            <CInputGroupText>End Date (Optional)</CInputGroupText>
            <CFormInput 
              type='date' 
              placeholder="If not specified, current date will be used"
              onChange={(e) => {
                if (e.target.value) {
                  const date = new Date(e.target.value);
                  setEndDate(date);
                } else {
                  setEndDate(null);
                }
              }}
            />
          </CInputGroup>
          
          {startDate && endDate && startDate > endDate && (
            <div className="text-danger mt-2">
              Start date must be before end date.
            </div>
          )}
          {!endDate && (
            <div className="text-muted mt-2">
              <small>If end date is not specified, the current date will be used.</small>
            </div>
          )}
        </>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => setShowModal(false)}>
          Cancel
        </CButton>
        <CLoadingButton
          color="primary" 
          onClick={handleExportCSV}
          loading={isLoading}
          disabled={startDate && endDate ? startDate > endDate : false}
        >
          <CIcon icon={cilFile} className="me-2" />
          Export CSV
        </CLoadingButton>
      </CModalFooter>
    </CModal>
  );
};

export default ExportActivitiesModal;

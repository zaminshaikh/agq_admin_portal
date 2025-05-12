import { CModal, CModalHeader, CModalTitle, CModalBody, CMultiSelect, CFormInput, CModalFooter, CButton, CInputGroup, CInputGroupText, CLoadingButton } from '@coreui/react-pro';
import { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import React, { useMemo, useState } from 'react';
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
    
    const arr = [...titles];
    return arr.map((title) => ({ label: title, value: title }));
  }, [selectedClients, clients]);

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
      if (startDate && endDate) {
        filteredActivities = filteredActivities.filter(activity => {
          const activityDate = activity.time instanceof Date 
            ? activity.time 
            : new Date(activity.time);
          return activityDate >= startDate && activityDate <= endDate;
        });
      }
      
      // Convert to CSV
      const headers = ["Client", "Type", "Time", "Recipient", "Amount", "Fund"];
      const rows = filteredActivities.map(activity => [
        activity.parentName || '',
        activity.type || '',
        activity.formattedTime || '',
        activity.recipient || '',
        activity.amount?.toString() || '',
        activity.fund || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
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

          <CInputGroup className='mb-3'>
            <CInputGroupText>Start Date</CInputGroupText>
            <CFormInput 
              type='date' 
              onChange={(e) => {
                const date = new Date(e.target.value);
                setStartDate(date);
              }}
            />
            <CInputGroupText>End Date</CInputGroupText>
            <CFormInput 
              type='date' 
              onChange={(e) => {
                const date = new Date(e.target.value);
                setEndDate(date);
              }}
            />
          </CInputGroup>
          
          {startDate && endDate && startDate > endDate && (
            <div className="text-danger mt-2">
              Start date must be before end date.
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

import { useTranslation } from "react-i18next";
import ActivitiesTable from "./ActivitiesTable";
import { useEffect, useState } from "react";
import { DatabaseService, Client, ScheduledActivity, Activity } from "src/db/database";
import { CButton, CCol, CRow, CSpinner } from "@coreui/react-pro";
import ScheduledActivitiesTable from "./ScheduledActivitiesTable";
import { CreateActivity } from "./CreateActivity";
import ExportActivitiesModal from "./ExportActivitiesModal";
import { cilCloudDownload, cilFile } from "@coreui/icons";
import CIcon from "@coreui/icons-react";
import { usePermissions } from "../../contexts/PermissionContext";

const Activities = () => {
    useTranslation();
    const { canWrite, admin } = usePermissions();
    const [isLoading, setIsLoading] = useState(true);

    // Initialize database service with current admin
    useEffect(() => {
        if (admin) {
            const db = new DatabaseService();
            db.setCurrentAdmin(admin);
        }
    }, [admin]);

    const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
    const [showExportActivitiesModal, setShowExportActivitiesModal] = useState(false);

    const [allActivities, setAllActivities] = useState<Activity[]>([]); // New state for original activities
    const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
    const [scheduledActivities, setScheduledActivities] = useState<ScheduledActivity[]>([]); // New state for original activities
    
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string | number>(); 
    const [clientOptions, setClientOptions] = useState<{ label: string; value: string }[]>([]);

    useEffect(() => {
      const fetchActivities = async () => {
          const db = new DatabaseService();
          if (admin) {
              db.setCurrentAdmin(admin);
          }
          const activities = await db.getActivities();
          const newScheduledActivities = await db.getScheduledActivities();


          const clients = await db.getClients();

          setScheduledActivities(newScheduledActivities); // Store the original activities
          setFilteredActivities(activities);
          setAllActivities(activities); // Store the original activities
          setClients(clients);
          
          // Create client options for the export modal
          const options = clients.map(client => ({
            label: `${client.firstName} ${client.lastName}`,
            value: client.cid
          }));
          setClientOptions(options);

          setIsLoading(false);
      };
      fetchActivities();
    }, [admin]);


    if (isLoading) {
      return( 
          <div className="text-center">
              <CSpinner color="primary"/>
          </div>
      )
    }

    return (
        <div>
            {showCreateActivityModal && 
            <CreateActivity 
                showModal={showCreateActivityModal} 
                setShowModal={setShowCreateActivityModal} 
                clients={clients} 
                selectedClient={selectedClient} 
                setAllActivities={setAllActivities} 
                setFilteredActivities={setFilteredActivities}
                setScheduledActivities={setScheduledActivities}
            />}
            
            {showExportActivitiesModal && 
            <ExportActivitiesModal 
                showModal={showExportActivitiesModal} 
                setShowModal={setShowExportActivitiesModal}
                clientOptions={clientOptions}
                allActivities={allActivities}
            />}

            <CRow className="mb-3">
              <CCol>
                <CButton 
                    color='primary' 
                    onClick={() => setShowCreateActivityModal(true)} 
                    className="w-100"
                    disabled={!canWrite}
                >
                    Add Activity +
                </CButton>
              </CCol>
              <CCol>
                <CButton color='success' onClick={() => setShowExportActivitiesModal(true)} className="w-100">
                  <CIcon icon={cilCloudDownload} className="me-2" /> Export to CSV
                </CButton>
              </CCol>
            </CRow>
            <ActivitiesTable 
                allActivities={allActivities}
                setAllActivities={setAllActivities}
                filteredActivities={filteredActivities}
                setFilteredActivities={setFilteredActivities}
                clients={clients}
                setClients={setClients}
                selectedClient={selectedClient}
                setSelectedClient={setSelectedClient}
            />
            <ScheduledActivitiesTable 
                scheduledActivities={scheduledActivities} 
                setScheduledActivities={setScheduledActivities}
                clients={clients}
                setClients={setClients}
            />
        </div>
    );
};

export default Activities;
import { useTranslation } from "react-i18next";
import ActivitiesTable from "./ActivitiesTable";
import { useEffect, useState } from "react";
import { DatabaseService, Client, ScheduledActivity, Activity } from "src/db/database";
import { CButton, CSpinner } from "@coreui/react-pro";
import ScheduledActivitiesTable from "./ScheduledActivitiesTable";
import { CreateActivity } from "./CreateActivity";

const Activities = () => {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(true);

    const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);

    const [allActivities, setAllActivities] = useState<Activity[]>([]); // New state for original activities
    const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
    const [scheduledActivities, setScheduledActivities] = useState<ScheduledActivity[]>([]); // New state for original activities
    
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string | number>(); 

    useEffect(() => {
      const fetchActivities = async () => {
          const db = new DatabaseService();
          const activities = await db.getActivities();
          const newScheduledActivities = await db.getScheduledActivities();


          const clients = await db.getClients();

          setScheduledActivities(newScheduledActivities); // Store the original activities
          setFilteredActivities(activities);
          setAllActivities(activities); // Store the original activities
          setClients(clients);

          setIsLoading(false);
      };
      fetchActivities();
    }, []);


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
            <div className="d-grid gap-2 py-3">
                <CButton color='primary' onClick={() => setShowCreateActivityModal(true)}>Add Activity +</CButton>
            </div> 
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
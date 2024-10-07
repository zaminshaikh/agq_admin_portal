import React, { act, useEffect, useState } from 'react';
import { CModal, CModalHeader, CModalTitle, CModalFooter, CButton } from '@coreui/react-pro';
import { DatabaseService, Activity, emptyActivity, Client, emptyClient } from 'src/db/database';
import { ValidateActivity, ActivityInputModalBody } from './ActivityInputModalBody';
import { FormValidationErrorModal } from '../../components/ErrorModal';

interface EditActivityProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    clients: Client[]; 
    activity?: Activity;
    selectedClient?: string | number;
    setAllActivities?: (activites: Activity[]) => void;
    setFilteredActivities?: (activites: Activity[]) => void;
    onSubmit?: (updatedActivity: Activity) => void;
}

const handleEditActivity = async (activityState: Activity, clientState: Client) => {
    const db = new DatabaseService();

    if (activityState.isAmortization === true) {
        
        const profit: Activity = {
            type: 'profit',
            amount: activityState.amount - (activityState.principalPaid ?? 0),
            parentDocId: activityState.parentDocId,
            time: activityState.time,
            recipient: activityState.recipient,
            fund: activityState.fund,
            isDividend: false,
        }
        
        const withdrawal: Activity = {
            type: 'withdrawal',
            amount: activityState.principalPaid ?? 0,
            parentDocId: activityState.parentDocId,
            time: activityState.time,
            recipient: activityState.recipient,
            fund: activityState.fund,
            isDividend: false,
        }
        let promises = [];
        promises.push(db.createActivity(profit, clientState.cid));
        promises.push(db.createActivity(withdrawal, clientState.cid));
        promises.push(db.deleteActivity(activityState));

        await Promise.all(promises);
        return
    }
    
    // Create activity with client cid
    await db.setActivity(activityState, {activityDocId: activityState.id}, clientState!.cid);

    if ((activityState.isDividend || activityState.type === 'manual-entry'|| activityState.type === 'deposit' || activityState.type === 'withdrawal') && clientState) {
        await db.setAssets(clientState);
    }
}

const EditActivity: React.FC<EditActivityProps> = ({ showModal, setShowModal, clients, activity, selectedClient, setAllActivities, setFilteredActivities, onSubmit=handleEditActivity}) => {
    const db = new DatabaseService();

    const [activityState, setActivityState] = useState<Activity>(activity ?? emptyActivity);
    const [clientState, setClientState] = useState<Client | null>(emptyClient);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);
    const [override, setOverride] = useState(false);

    const clientOptions = clients!
        .map(client => ({value: client.cid, label: client.firstName + ' ' + client.lastName, selected: activity?.parentDocId === client.cid }))
        .sort((a, b) => a.label.localeCompare(b.label));;
    
    // TODO: THIS DOES NOT WORK UNTIL NON USER CAN BE A RECIPIENT   
    // if (clientOptions.find(option => option.value === activity?.recipient) === undefined ) {
    //     const nonClientOption = {value: activity?.recipient as string, label: activity?.recipient as string, selected: true};   
    //     clientOptions.push(nonClientOption);
    // }



    useEffect(() => {
        const createActivityIfOverride = async () => {
            if (override) {
                if (!ValidateActivity(activityState, setInvalidInputFields)) {
                    setShowErrorModal(true);
                    return;
                }

                if (override) {
                    setActivityState({
                        ...activityState,
                        time: new Date(),
                    });
                }

                if (!clientState) {
                    console.error("Invalid client state");
                    return;
                }
                
                handleEditActivity(activityState, clientState);
                
                setShowModal(false);
                const activities = await db.getActivities(); // Get the new updated activities
                if (setAllActivities) {
                    setAllActivities(activities);
                }
                // Filter by the client we just edited an activity for
                if (setFilteredActivities) {
                    setFilteredActivities(activities.filter((activities) => activities.parentDocId === (selectedClient ?? clientState.cid)));
                }
            }
        };
        createActivityIfOverride();
    }, [override]);

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const client = await db.getClient(activityState.parentDocId ?? '');
                setClientState(client);

            } catch (error) {
                console.error('Failed to fetch client:', error);
            }
        };
        fetchClient();
    }, []);

    return (
        <>
            {showErrorModal && <FormValidationErrorModal showErrorModal={showErrorModal} setShowErrorModal={setShowErrorModal} invalidInputFields={invalidInputFields} setOverride={setOverride}/>}
            <CModal 
                scrollable
                visible={showModal} 
                backdrop="static" 
                size="xl" 
                alignment="center"
                onClose={() => setShowModal(false)}>
                <CModalHeader closeButton>
                    <CModalTitle>Edit Activity</CModalTitle>
                </CModalHeader>
                <ActivityInputModalBody
                    activityState={activityState}
                    setActivityState={setActivityState}
                    clientState={clientState}
                    setClientState={setClientState}
                    clientOptions={clientOptions}            
                />
                <CModalFooter>
                    <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>Cancel</CButton>
                    <CButton color="primary" onClick={ async () => {
                        if (!ValidateActivity(activityState, setInvalidInputFields)) {
                            setShowErrorModal(true);
                            return;
                        }

                        if (override) {
                            setActivityState({
                                ...activityState,
                                time: new Date(),
                            });
                        }

                        if (!clientState) {
                            console.error("Invalid client state");
                            return;
                        }
                        
                        onSubmit(activityState, clientState);
                        
                        setShowModal(false);
                        const activities = await db.getActivities(); // Get the new updated activities
                        if (setAllActivities) {
                            setAllActivities(activities);
                        }
                        // Filter by the client we just edited an activity for
                        if (setFilteredActivities) {
                            setFilteredActivities(activities.filter((activities) => activities.parentDocId === (selectedClient ?? clientState.cid)));
                        }
                    }}>Update</CButton>
                </CModalFooter>
            </CModal>
        </>
        
    )
}


export default EditActivity;
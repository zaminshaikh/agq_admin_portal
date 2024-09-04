import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle} from "@coreui/react-pro"
import { useEffect, useState } from "react";
import React from "react";
import { Activity, DatabaseService, User, emptyActivity } from '../../db/database.ts'
import { ActivityInputModalBody } from "./ActivityInputModalBody.tsx";
import { ValidateActivity } from "./ActivityInputModalBody.tsx";
import { FormValidationErrorModal } from '../../components/ErrorModal';
import Activities from './Activities';


interface ShowModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    users?: User[];
    selectedUser?: string | number;
    setAllActivities: (activites: Activity[]) => void;
    setFilteredActivities: (activites: Activity[]) => void;
}


export const CreateActivity: React.FC<ShowModalProps> = ({showModal, setShowModal, users, selectedUser, setAllActivities, setFilteredActivities}) => {
const db = new DatabaseService();
    const [activityState, setActivityState] = useState<Activity>(emptyActivity);
    const [clientState, setClientState] = useState<User | null>(users?.find(user => user.cid === selectedUser) || null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);
    const [override, setOverride] = useState(false);

    const userOptions = users!.map(user => ({value: user.cid, label: user.firstName + ' ' + user.lastName}))
    const handleCreateActivity = async () => {
        if (!ValidateActivity(activityState, setInvalidInputFields) && !override) {
            setShowErrorModal(true);
        } else {
            if (override) {
                setActivityState({
                    ...activityState,
                    time: new Date(),
                });
            }
            // Create activity with client cid
            await db.createActivity(activityState, clientState!.cid);
            if ((activityState.isDividend || activityState.type === 'manual-entry'|| activityState.type === 'deposit' || activityState.type === 'withdrawal') && clientState) {
                await db.setAssets(clientState);
            }
            setShowModal(false);
            const activities = await db.getActivities();
            setAllActivities(activities)
            setFilteredActivities(activities.filter((activities) => activities.parentDocId === (selectedUser ?? clientState?.cid)));
        }
    }

    useEffect(() => {
        const createActivityIfOverride = async () => {
            if (override) {
                await handleCreateActivity();
            }
        };
        createActivityIfOverride();
    }, [override]);

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
                    <CModalTitle>Create New Activity</CModalTitle>
                </CModalHeader>
                <ActivityInputModalBody
                    activityState={activityState}
                    setActivityState={setActivityState}
                    clientState={clientState}
                    setClientState={setClientState}
                    userOptions={userOptions}            
                />
                <CModalFooter>
                    <CButton color="primary" onClick={handleCreateActivity}>Create</CButton>
                    <CButton color="danger" variant="outline" onClick={() => setShowModal(false)}>Discard</CButton>
                </CModalFooter>
            </CModal>
        </>
        
    )
}

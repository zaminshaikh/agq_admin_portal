import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle} from "@coreui/react-pro"
import { useState } from "react";
import React from "react";
import { Activity, DatabaseService, User, emptyActivity } from '../../db/database.ts'
import { ActivityInputModalBody } from "./ActivityInputModalBody.tsx";
import { ErrorModal, ValidateActivity } from "./ActivityInputModalBody.tsx";


interface ShowModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    users?: User[];
}


export const CreateActivity: React.FC<ShowModalProps> = ({showModal, setShowModal, users}) => {
    const db = new DatabaseService();
    const [activityState, setActivityState] = useState<Activity>(emptyActivity);
    const [clientState, setClientState] = useState<User | null>(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);

    const userOptions = users!.map(user => ({value: user.cid, label: user.firstName + ' ' + user.lastName}))
    const handleCreateActivity = async () => {
        if (!ValidateActivity(activityState, setInvalidInputFields)) {
            setShowErrorModal(true);
            return;
        }
        // Create activity with client cid
        await db.createActivity(activityState, clientState!.cid);
        if ((activityState.isDividend || activityState.type === 'manual-entry') && clientState) {
            await db.setAssets(clientState);
        }
        setShowModal(false);
        window.location.reload();
    }



    return (
        <>
            {showErrorModal && <ErrorModal showErrorModal={showErrorModal} setShowErrorModal={setShowErrorModal} invalidInputFields={invalidInputFields} create={handleCreateActivity}/>}
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

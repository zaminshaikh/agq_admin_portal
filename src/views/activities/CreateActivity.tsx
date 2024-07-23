import { CButton, CModal, CModalFooter, CModalHeader, CModalTitle} from "@coreui/react-pro"
import { useState } from "react";
import React from "react";
import { Activity, DatabaseService, User, emptyActivity } from '../../db/database.ts'
import { ActivityInputModalBody, InputValidationStatus } from "./ActivityInputModalBody.tsx";
// import { ActivityInputModalBody } from "./ActivityInputModalBody.tsx";

interface ShowModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    users?: User[];
}



const initialInputValidationStatus: InputValidationStatus = {
    type: true,
    recipient: true,
    amount: true,
    date: true,
    time: true,
    fund: true,
}

export const CreateActivity: React.FC<ShowModalProps> = ({showModal, setShowModal, users}) => {
    const db = new DatabaseService();
    const [activityState, setActivityState] = useState<Activity>(emptyActivity);
    const [clientState, setClientState] = useState<User | null>(null);
    const [inputValidationStatus, setInputValidationStatus] = useState<InputValidationStatus>(initialInputValidationStatus);
    const userOptions = users!.map(user => ({value: user.cid, label: user.firstName + ' ' + user.lastName}))
    const handleCreateActivity = async () => {
        // const isValid = validateInputs();
        // if (!isValid) {
        //     return;
        // }
        await db.createActivity(activityState, clientState!.cid);
        setShowModal(false);
        window.location.reload();
    }

    const validateInputs = () => {
        const newInputValidationStatus = {
            ...inputValidationStatus,
            type: activityState.type !== '',
            recipient: activityState.recipient !== '',
            amount: activityState.amount !== 0,
            fund: activityState.fund !== '',
        }
        setInputValidationStatus(newInputValidationStatus);
        return Object.values(newInputValidationStatus).every((status) => status);
    }

    return (
        <CModal 
            scrollable
            visible={showModal} 
            backdrop="static" 
            size="xl" 
            onClose={() => setShowModal(false)}>
            <CModalHeader closeButton>
                <CModalTitle>Create New Activity</CModalTitle>
            </CModalHeader>
            <ActivityInputModalBody
                activityState={activityState}
                setActivityState={setActivityState}
                clientState={clientState}
                setClientState={setClientState}
                inputValidationStatus={inputValidationStatus}
                setInputValidationStatus={setInputValidationStatus} 
                userOptions={userOptions}            
            />
            <CModalFooter>
                <CButton color="primary" onClick={handleCreateActivity}>Create</CButton>
                <CButton color="danger" variant="outline" onClick={() => setShowModal(false)}>Discard</CButton>
            </CModalFooter>
        </CModal>
    )
}

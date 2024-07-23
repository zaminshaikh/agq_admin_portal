import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle} from "@coreui/react-pro"
import { useState } from "react";
import React from "react";
import { Activity, DatabaseService, User, emptyActivity } from '../../db/database.ts'
import { ActivityInputModalBody } from "./ActivityInputModalBody.tsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
// import { ActivityInputModalBody } from "./ActivityInputModalBody.tsx";

interface ShowModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    users?: User[];
}

export interface InputValidationStatus {
    type: boolean;
    recipient: boolean;
    amount: boolean;
    time: boolean;
    fund: boolean;
}

const initialInputValidationStatus: InputValidationStatus = {
    type: true,
    recipient: true,
    amount: true,
    time: true,
    fund: true,
}

export const CreateActivity: React.FC<ShowModalProps> = ({showModal, setShowModal, users}) => {
    const db = new DatabaseService();
    const [activityState, setActivityState] = useState<Activity>(emptyActivity);
    const [clientState, setClientState] = useState<User | null>(null);
    const [inputValidationStatus, setInputValidationStatus] = useState<InputValidationStatus>(initialInputValidationStatus);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);

    const userOptions = users!.map(user => ({value: user.cid, label: user.firstName + ' ' + user.lastName}))
    const handleCreateActivity = async () => {
        if (!ValidateActivity()) {
            setShowErrorModal(true);
            return;
        }
        await db.createActivity(activityState, clientState!.cid);
        setShowModal(false);
        window.location.reload();
    }

    type ValidationStatusKey = 'amount' | 'fund' | 'recipient' | 'time' | 'type' ;


    // amount: number;
    // fund: string;
    // recipient: string | User;
    // time: Date | Timestamp;
    // formattedTime?: string;
    // type: string;

    const ValidateActivity = () => {
        let validClient = true;
        let fields: string[] = [];
        let newInputValidationStatus = { ...inputValidationStatus };

        const fieldValidations: { name: ValidationStatusKey, displayName: string, condition: boolean }[] = [
            { name: 'amount', displayName: 'Activity Amount', condition: activityState.amount <= 0 || isNaN(activityState.amount) },
            { name: 'fund', displayName: 'Fund', condition: activityState.fund === '' },
            { name: 'recipient', displayName: 'Recipient', condition: activityState.recipient === '' },
            { name: 'time', displayName: 'Time', condition: activityState.time === null },
            { name: 'type', displayName: 'Type', condition: activityState.type === '' }
        ];

        fieldValidations.forEach(({ name, displayName, condition }) => {
            if (condition) {
                fields.push(displayName);
                newInputValidationStatus[name] = false;
                validClient = false;
            }
        });

        setInputValidationStatus(newInputValidationStatus);
        setInvalidInputFields(fields);

        return validClient;
    }

    const ErrorModal = () => {
        return (
            <CModal
                scrollable
                alignment="center"
                visible={showErrorModal} 
                backdrop="static" 
                onClose={() => setShowErrorModal(false)}
            >
                <CModalHeader>
                    <CModalTitle>
                        <FontAwesomeIcon className="pr-5" icon={faExclamationTriangle} color="red" />  Error
                    </CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <h5>The following fields have not been filled:</h5>
                    <ul>
                        {invalidInputFields.map((message, index) => (
                            <li key={index}>{message}</li>
                        ))}
                    </ul>
                </CModalBody>
                <CModalFooter>
                    <CButton color="primary" onClick={() => setShowErrorModal(false)}>OK</CButton>
                </CModalFooter>
            </CModal>
        )
    }
    return (
        <>
            {showErrorModal && <ErrorModal />}
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
        </>
        
    )
}

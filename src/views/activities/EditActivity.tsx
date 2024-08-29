import React, { useEffect, useState } from 'react';
import { CModal, CModalHeader, CModalTitle, CModalFooter, CButton } from '@coreui/react-pro';
import { DatabaseService, Activity, emptyActivity, User, emptyUser } from 'src/db/database';
import { ValidateActivity, ErrorModal, ActivityInputModalBody } from './ActivityInputModalBody';

interface EditActivityProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    users: User[]; 
    activity?: Activity;
}

const EditActivity: React.FC<EditActivityProps> = ({ showModal, setShowModal, users, activity }) => {
    const db = new DatabaseService();

    const [activityState, setActivityState] = useState<Activity>(activity ?? emptyActivity);
    const [clientState, setClientState] = useState<User | null>(emptyUser);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);
    const [override, setOverride] = useState(false);

    const userOptions = users!.map(user => ({value: user.cid, label: user.firstName + ' ' + user.lastName, selected: activity?.recipient === user.firstName + ' ' + user.lastName || activity?.parentDocId === user.cid }));
    
    // TODO: THIS DOES NOT WORK UNTIL NON USER CAN BE A RECIPIENT   
    // if (userOptions.find(option => option.value === activity?.recipient) === undefined ) {
    //     const nonUserOption = {value: activity?.recipient as string, label: activity?.recipient as string, selected: true};   
    //     userOptions.push(nonUserOption);
    // }

    const handleEditActivity = async () => {
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

        // Create activity with client cid
        await db.setActivity(activityState, {activityDocId: activityState.id}, clientState!.cid);

        if (( (activityState.isDividend && activityState.type === 'profit') || activityState.type === 'manual-entry') && clientState) {
            await db.setAssets(clientState);
        }
        setShowModal(false);
        window.location.reload();
    }

    useEffect(() => {
        const createActivityIfOverride = async () => {
            if (override) {
                await handleEditActivity();
            }
        };
        createActivityIfOverride();
    }, [override]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await db.getUser(activityState.parentDocId ?? '');
                setClientState(user);

            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, []);

    return (
        <>
            {showErrorModal && <ErrorModal showErrorModal={showErrorModal} setShowErrorModal={setShowErrorModal} invalidInputFields={invalidInputFields} setOverride={setOverride}/>}
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
                    userOptions={userOptions}            
                />
                <CModalFooter>
                    <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>Cancel</CButton>
                    <CButton color="primary" onClick={handleEditActivity}>Update</CButton>
                </CModalFooter>
            </CModal>
        </>
        
    )
}


export default EditActivity;
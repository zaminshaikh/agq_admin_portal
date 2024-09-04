import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from "@coreui/react-pro"
import { useEffect, useState } from "react";
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { IMaskMixin } from 'react-imask'
import React from "react";
import { DatabaseService, User, emptyUser } from '../../db/database.ts'
import { ClientInputModalBody, ValidateClient } from './ClientInputModalBody.tsx'
import { ErrorModal } from '../../components/ErrorModal';

// const CFormInputWithMask = React.forwardRef<HTMLInputElement, any>((props, ref) => (
//     <CFormInput
//         {...props}
//         ref={ref} // bind internal input
//     />
// ))

// const MaskedInput = IMaskMixin(CFormInputWithMask);

// State variable, determines if modal is shown based on UsersTable.tsx state
interface ShowModalProps {
        showModal: boolean;
        setShowModal: (show: boolean) => void;
        users?: User[];
        currentUser?: User;
}

// TODO: Perform validation on address and email
// Initial modal to create new client
export const EditClient: React.FC<ShowModalProps> = ({showModal, setShowModal, users, currentUser}) => {
    // Initialize the client state
    const initialClientState: User = {...currentUser ?? emptyUser,};

    const db = new DatabaseService();
    const [clientState, setClientState] = useState<User>(initialClientState);
    
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [useCompanyName, setUseCompanyName] = useState(clientState.companyName ? true : false) ;
    const userOptions = users!.map(user => ({value: user.cid, label: user.firstName + ' ' + user.lastName, selected: (currentUser?.connectedUsers?.includes(user.cid))}))
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);
    const [override, setOverride] = useState(false);

    const handleEditClient = async () => {
        if (!ValidateClient(clientState, useCompanyName, setInvalidInputFields)) {
            setShowErrorModal(true);
        } else {
            if (override) {
                setClientState({
                    ...clientState,
                    dob: null,
                    firstDepositDate: null,
                });
            }
            await db.updateUser(clientState);
            setShowModal(false);
            window.location.reload();
        }
    }

    useEffect(() => {
        const editClientIfOverride = async () => {
            if (override) {
                await handleEditClient();
            }
        };
        editClientIfOverride();
    }, [override]);

    return (
        
        <div>
            {showErrorModal && <ErrorModal showErrorModal={showErrorModal} 
                setShowErrorModal={setShowErrorModal}
                invalidInputFields={invalidInputFields}
                setOverride={setOverride}/>} 
            <CModal 
                scrollable
                alignment="center"
                visible={showModal} 
                backdrop="static" 
                size="xl" 
                onClose={() => setShowModal(false)}>
                <CModalHeader>
                    <CModalTitle>Edit {currentUser?.firstName} {currentUser?.lastName}</CModalTitle>
                </CModalHeader>
                <ClientInputModalBody 
                    clientState={clientState} 
                    setClientState={setClientState} 
                    useCompanyName={useCompanyName}
                    setUseCompanyName={setUseCompanyName} 
                    userOptions={userOptions}
                    viewOnly={false}/>
                <CModalFooter>
                    <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>Cancel</CButton>
                    <CButton color="primary" onClick={() => handleEditClient()}>Update</CButton>
                </CModalFooter>
            </CModal>
        </div>
    )
}

export default EditClient;
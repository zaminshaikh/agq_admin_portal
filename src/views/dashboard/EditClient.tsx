import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from "@coreui/react-pro"
import { useEffect, useState } from "react";
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { IMaskMixin } from 'react-imask'
import React from "react";
import { DatabaseService, Client, emptyUser } from '../../db/database.ts'
import { ClientInputModalBody, ValidateClient } from './ClientInputModalBody.tsx'
import { FormValidationErrorModal } from '../../components/ErrorModal';

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
        clients?: Client[];
        activeClient?: Client;
        onSave?: (updatedClient: Client) => void;
}

// TODO: Perform validation on address and email
// Initial modal to create new client
export const EditClient: React.FC<ShowModalProps> = ({showModal, setShowModal, clients: clients, activeClient: activeClient}) => {
    // Initialize the client state
    const initialClientState: Client = {...activeClient ?? emptyUser,};

    const db = new DatabaseService();
    const [clientState, setClientState] = useState<Client>(initialClientState);
    
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [useCompanyName, setUseCompanyName] = useState(clientState.companyName ? true : false) ;
    const clientOptions = clients!.map(client => ({value: client.cid, label: client.firstName + ' ' + client.lastName, selected: (activeClient?.connectedUsers?.includes(client.cid))}))
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);
    const [override, setOverride] = useState(false);

    const handleEditClient = async () => {
        if (!ValidateClient(clientState, useCompanyName, setInvalidInputFields) && !override) {
            // If validation fails, show error modal
            setShowErrorModal(true);
        } else {
            if (override) {
                setClientState({
                    ...clientState,
                    dob: null,
                    firstDepositDate: null,
                });
            }
            // If validation passes, create the client and reload the page
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
            {showErrorModal && <FormValidationErrorModal showErrorModal={showErrorModal} 
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
                    <CModalTitle>Edit {activeClient?.firstName} {activeClient?.lastName}</CModalTitle>
                </CModalHeader>
                <ClientInputModalBody 
                    clientState={clientState} 
                    setClientState={setClientState} 
                    useCompanyName={useCompanyName}
                    setUseCompanyName={setUseCompanyName} 
                    clientOptions={clientOptions}
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
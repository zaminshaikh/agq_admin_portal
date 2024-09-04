import { CButton, CModal, CModalHeader, CModalTitle, CModalFooter} from "@coreui/react-pro"
import { useEffect, useState } from "react";
import React from "react";
import { DatabaseService, User, emptyUser } from '../../db/database.ts'
import { ClientInputModalBody } from "./ClientInputModalBody.tsx";
import { ValidateClient } from "./ClientInputModalBody.tsx";
import { FormValidationErrorModal } from '../../components/ErrorModal.tsx';

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
}
// Initialize the client state
const initialClientState: User = emptyUser

// TODO: Perform validation on address and email
// Initial modal to create new client
const CreateClient: React.FC<ShowModalProps> = ({showModal, setShowModal, users}) => {
    const db = new DatabaseService();
    const [clientState, setClientState] = useState<User>(initialClientState);

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [useCompanyName, setUseCompanyName] = useState(false);
    const userOptions = users!.map(user => ({value: user.cid, label: user.firstName + ' ' + user.lastName}))
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);
    const [override, setOverride] = useState(false);

    const handleCreateClient = async () => {
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
            await db.createUser(clientState);
            setShowModal(false);
            window.location.reload();
        }
    }

    useEffect(() => {
        const createClientIfOverride = async () => {
            if (override) {
                await handleCreateClient();
            }
        };
        createClientIfOverride();
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
                    <CModalTitle>Create a New Client</CModalTitle>
                </CModalHeader>
                <ClientInputModalBody 
                    clientState={clientState} 
                    setClientState={setClientState} 
                    useCompanyName={useCompanyName} 
                    setUseCompanyName={setUseCompanyName} 
                    userOptions={userOptions}
                    viewOnly={false}/>
                <CModalFooter>
                    <CButton color="danger" variant="outline" onClick={() => setShowModal(false)}>Discard</CButton>
                    <CButton color="primary" onClick={() => handleCreateClient()}>Create +</CButton>
                </CModalFooter>
            </CModal>
        </div>
    )
}

export default CreateClient;
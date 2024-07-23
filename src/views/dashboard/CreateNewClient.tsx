import { CButton, CModal, CModalHeader, CModalTitle, CModalFooter} from "@coreui/react-pro"
import { useState } from "react";
import React from "react";
import { DatabaseService, User, emptyUser } from '../../db/database.ts'
import { ClientInputModalBody } from "./ClientInputModalBody.tsx";
import { ValidateClient } from "./ClientInputModalBody.tsx";
import { ErrorModal } from "../activities/ActivityInputModalBody.tsx";

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

    const Create = async () => {
        if (!ValidateClient(clientState, useCompanyName, setInvalidInputFields)) {
            setShowErrorModal(true);
            
        } else {
            await db.createUser(clientState);
            setShowModal(false);
            window.location.reload();
        }
    }

    return (
        
        <div>
            {showErrorModal && <ErrorModal showErrorModal={showErrorModal} setShowErrorModal={setShowErrorModal} invalidInputFields={invalidInputFields}/> }
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
                    userOptions={userOptions}/>
                <CModalFooter>
                    <CButton color="danger" variant="outline" onClick={() => setShowModal(false)}>Discard</CButton>
                    <CButton color="primary" onClick={() => Create()}>Create +</CButton>
                </CModalFooter>
            </CModal>
        </div>
    )
}





export default CreateClient;

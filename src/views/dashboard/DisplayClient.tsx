import { CCol, CContainer, CFormCheck, CFormInput, CInputGroup, CInputGroupText, CModal, CModalBody, CModalHeader, CModalTitle, CMultiSelect, CRow } from "@coreui/react-pro"
import { Client } from "src/db/database";
import config from '../../../config.json'
import { formatCurrency } from '../../db/database';
import { ClientInputModalBody } from "./ClientInputModalBody";


interface ShowModalProps {
        showModal: boolean;
        setShowModal: (show: boolean) => void;
        currentClient: Client;
        clients?: Client[];
}

export const DisplayClient: React.FC<ShowModalProps> = ({showModal, setShowModal, clients, currentClient: currentClient}) => {
    const clientOptions = clients!.map(client => ({value: client.cid, label: client.firstName + ' ' + client.lastName, selected: (currentClient?.connectedUsers?.includes(client.cid))}))
    return (
        <CModal         
            scrollable
            alignment="center"
            visible={showModal} 
            backdrop="static" 
            size="xl" 
            onClose={() => setShowModal(false)}>
            <CModalHeader>
                <CModalTitle>{currentClient?.firstName + ' ' + currentClient?.lastName}</CModalTitle>
            </CModalHeader>
            <ClientInputModalBody 
                    clientState={currentClient} 
                    setClientState={(client: Client) => {}} 
                    useCompanyName={currentClient.companyName ? true : false}
                    setUseCompanyName={(useCompanyName: boolean) => {}} 
                    clientOptions={clientOptions}
                    viewOnly={true}/>
        </CModal>
    )
}

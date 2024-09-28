import { CCol, CContainer, CFormCheck, CFormInput, CInputGroup, CInputGroupText, CModal, CModalBody, CModalHeader, CModalTitle, CMultiSelect, CRow } from "@coreui/react-pro"
import { Client } from "src/db/database";
import config from '../../../config.json'
import { formatCurrency } from '../../db/database';
import { ClientInputModalBody } from "./ClientInputModalBody";


interface ShowModalProps {
        showModal: boolean;
        setShowModal: (show: boolean) => void;
        currentUser: Client;
        clients?: Client[];
}

export const DisplayClient: React.FC<ShowModalProps> = ({showModal, setShowModal, clients, currentUser: currentUser}) => {
    const clientOptions = clients!.map(client => ({value: client.cid, label: client.firstName + ' ' + client.lastName, selected: (currentUser?.connectedUsers?.includes(client.cid))}))
    return (
        <CModal         
            scrollable
            alignment="center"
            visible={showModal} 
            backdrop="static" 
            size="xl" 
            onClose={() => setShowModal(false)}>
            <CModalHeader>
                <CModalTitle>{currentUser?.firstName + ' ' + currentUser?.lastName}</CModalTitle>
            </CModalHeader>
            <ClientInputModalBody 
                    clientState={currentUser} 
                    setClientState={(client: Client) => {}} 
                    useCompanyName={currentUser.companyName ? true : false}
                    setUseCompanyName={(useCompanyName: boolean) => {}} 
                    clientOptions={clientOptions}
                    viewOnly={true}/>
        </CModal>
    )
}

const AssetFormComponent: React.FC<{title: string, id: string, fund: string, client?: Client}> = ({title, id, fund, client}) => {
    return (
        <CInputGroup className="mb-3 py-3">
            <CInputGroupText style={{ width: "200px" }} id="personal">{title}</CInputGroupText>
            <CFormInput id={id} disabled value={formatCurrency(client?.[config.ASSETS_SUBCOLLECTION]?.[fund]?.[getAssetType(id)])}/>
        </CInputGroup>
    )      
}

const getAssetType = (id: string) => {
    switch (id) {
        case "agq-personal":
        case "ak1-personal":
            return "personal";
        case "agq-company":
        case "ak1-company":
            return "company";
        case "agq-ira":
        case "ak1-ira":
            return "trad";
        case "agq-roth-ira":
        case "ak1-roth-ira":
            return "roth";
        case "agq-sep-ira":
        case "ak1-sep-ira":
            return "sep";
        case "agq-nuview-cash-ira":
        case "ak1-nuview-cash-ira":
            return "nuviewTrad";
        case "agq-nuview-cash-roth-ira":
        case "ak1-nuview-cash-roth-ira":
            return "nuviewRoth";
        default:
            return "";
    }
}

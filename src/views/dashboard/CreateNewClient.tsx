import { CButton, CCol, CContainer, CFormCheck, CFormInput, CHeader, CInputGroup, CInputGroupText, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CMultiSelect, CRow } from "@coreui/react-pro"
import { useState } from "react";
import { User, createUser } from "src/db/database";
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// import config from "../../config.json"


// State variable, determines if modal is shown based on UsersTable.tsx state
interface ShowModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    users?: User[];
}

export interface ClientState {
    [key: string]: any;
    firstName: string;
    lastName: string;
    companyName: string;
    connectedUsers: string[];
    assets: {
        [key: string]: any;
        agq: {
        personal: number;
        company: number;
        ira: number;
        rothIra: number;
        sepIra: number;
        nuviewCashIra: number;
        nuviewCashRothIra: number;
        };
        ak1: {
        personal: number;
        company: number;
        ira: number;
        rothIra: number;
        sepIra: number;
        nuviewCashIra: number;
        nuviewCashRothIra: number;
        };
    };
}

// Initialize the client state
const initialClientState: ClientState = {
  firstName: '',
  lastName: '',
  companyName: '',
  connectedUsers: [],
  assets: {
    agq: {
      personal: 0,
      company: 0,
      ira: 0,
      rothIra: 0,
      sepIra: 0,
      nuviewCashIra: 0,
      nuviewCashRothIra: 0,
    },
    ak1: {
      personal: 0,
      company: 0,
      ira: 0,
      rothIra: 0,
      sepIra: 0,
      nuviewCashIra: 0,
      nuviewCashRothIra: 0,
    },
  },
};

// Initial modal to create new client
const CreateNewClient: React.FC<ShowModalProps> = ({showModal, setShowModal, users}) => {
    const [clientState, setClientState] = useState<ClientState>(initialClientState);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [useCompanyName, setUseCompanyName] = useState(false);


    const userOptions = users!.map(user => ({value: user.cid, label: user.firstname + ' ' + user.lastname}))

    const CreateClient = async () => {
        if (clientState.firstName === '' || clientState.lastName === '' || (useCompanyName && clientState.companyName === '' )) {
            setShowErrorModal(true);
        } else {
            console.log("Creating client...");
            console.log(clientState);
            await createUser(clientState);
            setShowModal(false);
            window.location.reload();
        }
    }



    const ErrorModal = ({clientState}: {clientState: ClientState}) => {
        let modalMessages: string[] = [];

        if (clientState.firstName === '') {
            modalMessages.push("First Name");
        } 
        if (clientState.lastName === '') {
            modalMessages.push("Last Name");
        }
        if (useCompanyName && clientState.companyName === '' ) {
            modalMessages.push("Company Name");
        }
        
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
                        {modalMessages.map((message, index) => (
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
        
        <div>
            <ErrorModal clientState={clientState}/>
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
                <CModalBody>
                    <CInputGroup className="mb-3 px-5 py-3">
                        <CInputGroupText>Client's First Name</CInputGroupText>
                        <CFormInput id="first-name" 
                            onChange={(e) =>{
                                const newClientState = {
                                    ...clientState,
                                    firstName: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                        <CInputGroupText>Client's Last Name</CInputGroupText>
                        <CFormInput id="last-name" 
                            onChange={
                                (e) => {
                                    const newClientState = {
                                        ...clientState,
                                        lastName: e.target.value
                                    }
                                    setClientState(newClientState)
                                }
                            }
                        />
                    </CInputGroup>

                    <CInputGroup className="mb-3 px-5 py-3">
                        <CInputGroupText>
                            <CFormCheck type="checkbox" id="useCompanyName" checked={useCompanyName} onChange={(e) => setUseCompanyName(e.target.checked)}/>
                        </CInputGroupText>
                        <CInputGroupText>Company Name</CInputGroupText>
                        <CFormInput id="company-name" 
                        onChange={
                            (e) => {
                                const newClientState = {
                                    ...clientState,
                                    companyName: e.target.value
                                }
                                setClientState(newClientState)
                            }
                        } 
                        disabled={!useCompanyName}/>
                    </CInputGroup>

                    <CMultiSelect 
                        id="connected-users"
                        className="mb-3 px-5 py-3" 
                        options={userOptions} 
                        placeholder="Select Connected Users" 
                        selectAll={false}
                        onChange={
                            (selectedValues) => {
                                const newClientState = {
                                    ...clientState,
                                    connectedUsers: selectedValues.map(selected => selected.value as string)
                                }
                                setClientState(newClientState)
                            }
                        }
                    /> 
                    
                    <CContainer className="px-5 py-3">
                        <CRow>
                        <CCol>
                            <h5>AGQ Fund Assets</h5>
                            <AssetFormComponent2 title="Personal" id="agq-personal" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="Company" id="agq-company" fund="agq" disabled={!useCompanyName} state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="IRA" id="agq-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="Roth IRA" id="agq-roth-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="SEP IRA" id="agq-sep-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="NuView Cash IRA" id="agq-nuview-cash-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="NuView Cash Roth IRA" id="agq-nuview-cash-roth-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                        </CCol>
                        <CCol>
                            <h5>AK1 Fund Assets</h5>
                            <AssetFormComponent2 title="Personal" id="ak1-personal" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="Company" id="ak1-company" fund="ak1" disabled={!useCompanyName} state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="IRA" id="ak1-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="Roth IRA" id="ak1-roth-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="SEP IRA" id="ak1-sep-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="NuView Cash IRA" id="ak1-nuview-cash-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent2 title="NuView Cash Roth IRA" id="ak1-nuview-cash-roth-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                        </CCol>
                        </CRow>
                    </CContainer>

                    <div className="mb-3 px-5 py-3">
                        <h5>Upload Previous Activities</h5>
                        <div  className="mb-3 py-3">
                            <CFormInput type="file" id="formFile"/>
                        </div>
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="danger" variant="outline" onClick={() => setShowModal(false)}>Discard</CButton>
                    <CButton color="primary" onClick={() => CreateClient()}>Create +</CButton>
                </CModalFooter>
            </CModal>
        </div>
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
            return "ira";
        case "agq-roth-ira":
        case "ak1-roth-ira":
            return "rothIra";
        case "agq-sep-ira":
        case "ak1-sep-ira":
            return "sepIra";
        case "agq-nuview-cash-ira":
        case "ak1-nuview-cash-ira":
            return "nuviewCashIra";
        case "agq-nuview-cash-roth-ira":
        case "ak1-nuview-cash-roth-ira":
            return "nuviewCashRothIra";
        default:
            return "";
    }
}


const AssetFormComponent2: React.FC<{title: string, id: string, disabled?: boolean, fund: string, state: ClientState, setClientState: (clientState: ClientState) => void}> = ({title, id, disabled, fund, state, setClientState}) => {
    return (
        <CInputGroup className="mb-3 py-3">
            <CInputGroupText style={{ width: "200px" }} id="personal">{title}</CInputGroupText>
            <CInputGroupText>$</CInputGroupText>
            <CFormInput id={id} disabled={disabled} type="number" step="1000" value={state["assets"][fund][getAssetType(id)]} 
            onChange={(e) => {
                const value = e.target.value;
                if (/^\d*\.?\d{0,2}$/.test(value)) {
                    const newState = {
                        ...state,
                        assets: {
                            ...state.assets,
                            [fund]: {
                                ...state.assets[fund],
                                [getAssetType(id)]: parseFloat(value)
                            }
                        }
                    };
                    console.log(`${id}`)
                    console.log(`${getAssetType(id)}`)
                    console.log(`${JSON.stringify(state)}`);
                    console.log(`${JSON.stringify(newState)}`);

                    setClientState(newState);
                }
            }}
            onBlur={(e) => {
                const value = e.target.value;
                if (value === '' || isNaN(parseFloat(value))) {
                    const newState = {
                        ...state,
                        assets: {
                            ...state.assets,
                            agq: {
                                ...state.assets.agq,
                                [getAssetType(id)]: 0
                            }
                        }
                    };
                    setClientState(newState);
                } 
            }}/>
        </CInputGroup>
    )      
}

export default CreateNewClient;

    // const [firstName, setFirstName] = useState<string>('');
    // const [lastName, setLastName] = useState<string>('');

    // const [companyName, setCompanyName] = useState<string>('');
    // const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // const [agqPersonal, setAGQPersonal] = useState<number>(0);
    // const [agqCompany, setAGQCompany] = useState<number>(0);
    // const [agqIRA, setAGQIRA] = useState<number>(0);
    // const [agqRothIRA, setAGQRothIRA] = useState<number>(0);
    // const [agqSEPIRA, setAGQSEPIRA] = useState<number>(0);
    // const [agqNuviewCashIRA, setAGQNuviewCashIRA] = useState<number>(0);
    // const [agqNuviewCashRothIRA, setAGQNuviewCashRothIRA] = useState<number>(0);
    // const [ak1Personal, setAK1Personal] = useState<number>(0);
    // const [ak1Company, setAK1Company] = useState<number>(0);
    // const [ak1IRA, setAK1IRA] = useState<number>(0);
    // const [ak1RothIRA, setAK1RothIRA] = useState<number>(0);
    // const [ak1SEPIRA, setAK1SEPIRA] = useState<number>(0);
    // const [ak1NuviewCashIRA, setAK1NuviewCashIRA] = useState<number>(0);
    // const [ak1NuviewCashRothIRA, setAK1NuviewCashRothIRA] = useState<number>(0);

    // const getStateFunction = (id: string) => {
    //     switch (id) {
    //         case "agq-personal":
    //             return setAGQPersonal;
    //         case "agq-company":
    //             return setAGQCompany;
    //         case "agq-ira":
    //             return setAGQIRA;
    //         case "agq-roth-ira":
    //             return setAGQRothIRA;
    //         case "agq-sep-ira":
    //             return setAGQSEPIRA;
    //         case "agq-nuview-cash-ira":
    //             return setAGQNuviewCashIRA;
    //         case "agq-nuview-cash-roth-ira":
    //             return setAGQNuviewCashRothIRA;
    //         case "ak1-personal":
    //             return setAK1Personal;
    //         case "ak1-company":
    //             return setAK1Company;
    //         case "ak1-ira":
    //             return setAK1IRA;
    //         case "ak1-roth-ira":
    //             return setAK1RothIRA;
    //         case "ak1-sep-ira":
    //             return setAK1SEPIRA;
    //         case "ak1-nuview-cash-ira":
    //             return setAK1NuviewCashIRA;
    //         case "ak1-nuview-cash-roth-ira":
    //             return setAK1NuviewCashRothIRA;
    //         default:
    //             return undefined;
    //     }
    // }

// const AssetFormComponent: React.FC<{title: string, id: string, disabled?: boolean, value: number, setValue: (value: number) => void}> = ({title, id, disabled, value, setValue}) => {
    
//     return (
//         <CInputGroup className="mb-3 py-3">
//             <CInputGroupText style={{ width: "200px" }} id="personal">{title}</CInputGroupText>
//             <CInputGroupText>$</CInputGroupText>
//             <CFormInput id={id} disabled={disabled} type="number" step="1000" value={value} 
//             onChange={(e) => {
//                 const value = e.target.value;
//                 if (setValue && /^\d*\.?\d{0,2}$/.test(value)) {
//                     setValue!(parseFloat(value));
//                 }
//             }}
//             onBlur={(e) => {
//                 const value = e.target.value;
//                 if (setValue && value === '' || isNaN(parseFloat(value))) {
//                     setValue!(0);
//                 } else { 
//                     console.warn("Invalid value passed to AssetFormComponent");
//                 }
//             }}/>
//         </CInputGroup>
//     )      
// }

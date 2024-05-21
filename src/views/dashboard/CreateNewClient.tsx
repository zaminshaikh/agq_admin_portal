import { CButton, CCol, CContainer, CFormCheck, CFormInput, CInputGroup, CInputGroupText, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CMultiSelect, CRow } from "@coreui/react-pro"
import { useState } from "react";
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IMaskMixin } from 'react-imask'
import React from "react";
import { DatabaseService, User } from '../../db/database.ts'

const CFormInputWithMask = React.forwardRef<HTMLInputElement, any>((props, ref) => (
    <CFormInput
        {...props}
        ref={ref} // bind internal input
    />
))

const MaskedInput = IMaskMixin(CFormInputWithMask);

// State variable, determines if modal is shown based on UsersTable.tsx state
interface ShowModalProps {
        showModal: boolean;
        setShowModal: (show: boolean) => void;
        users?: User[];
}

// Initialize the client state
const initialClientState: User = {
    firstName: '',
    lastName: '',
    companyName: '',
    address: '',
    dob: new Date(),
    phoneNumber: '',
    firstDepositDate: new Date(),
    beneficiaryFirstName: '',
    beneficiaryLastName: '',
    connectedUsers: [],
    cid: '',
    uid: '',
    appEmail: '',
    initEmail: '',
    totalAssets: 0,
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

interface InputValidationStatus {
    firstName: boolean;
    lastName: boolean;
    companyName: boolean;
    address: boolean;
    dob: boolean;
    phoneNumber: boolean;
    initEmail: boolean;
    firstDepositDate: boolean;
    beneficiaryFirstName: boolean;
    beneficiaryLastName: boolean;
}

const initialInputValidationStatus: InputValidationStatus = {
    firstName: true,
    lastName: true,
    companyName: true,
    address: true,
    dob: true,
    phoneNumber: true,
    initEmail: true,
    firstDepositDate: true,
    beneficiaryFirstName: true,
    beneficiaryLastName: true,
}

// TODO: Perform validation on address and email
// Initial modal to create new client
const CreateNewClient: React.FC<ShowModalProps> = ({showModal, setShowModal, users}) => {
    const db = new DatabaseService();
    const [clientState, setClientState] = useState<User>(initialClientState);
    const [inputValidationStatus, setInputValidationStatus] = useState<InputValidationStatus>(initialInputValidationStatus);

    
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [useCompanyName, setUseCompanyName] = useState(false);
    const userOptions = users!.map(user => ({value: user.cid, label: user.firstName + ' ' + user.lastName}))
    const [invalidInputFields, setInvalidInputFields] = useState<string[]>([]);

    const CreateClient = async () => {
        if (!ValidateClient()) {
            setShowErrorModal(true);
            
        } else {
            await db.createUser(clientState);
            setShowModal(false);
            window.location.reload();
        }
    }

    const ValidateClient = () => { 
        let validClient = true;
        let fields = [];
        if (clientState.firstName === '') {
            fields.push("First Name");
            setInputValidationStatus({...inputValidationStatus, firstName: false});
            validClient = false;
        } 
        if (clientState.lastName === '') {
            fields.push("Last Name");
            setInputValidationStatus({...inputValidationStatus, lastName: false});
            validClient = false;
        }
        if (useCompanyName && clientState.companyName === '' ) {
            fields.push("Company Name");
            setInputValidationStatus({...inputValidationStatus, companyName: false});
            validClient = false;
        }
        if (clientState.address === '') { 
            fields.push("Address");
            setInputValidationStatus({...inputValidationStatus, address: false});
            validClient = false;
        }
        if (!clientState.dob || isNaN(clientState.dob.getTime())) {
            fields.push("DOB"); 
            setInputValidationStatus({...inputValidationStatus, dob: false});
            validClient = false;
        }
        if (clientState.phoneNumber === '') {
            fields.push("Phone Number");
            setInputValidationStatus({...inputValidationStatus, phoneNumber: false});
            validClient = false;
        }
        if (clientState.email === '') {
            fields.push("Email");
            setInputValidationStatus({...inputValidationStatus, initEmail: false});
            validClient = false;
        }
        if (!clientState.firstDepositDate || isNaN(clientState.firstDepositDate.getTime())) {
            fields.push("First Deposit Date");
            setInputValidationStatus({...inputValidationStatus, firstDepositDate: false});
            validClient = false;
        }
        if (clientState.beneficiaryFirstName === '') {
            fields.push("Beneficiary's First Name");
            setInputValidationStatus({...inputValidationStatus, beneficiaryFirstName: false});
            validClient = false;
        }
        if (clientState.beneficiaryLastName === '') {
            fields.push("Beneficiary's Last Name");
            setInputValidationStatus({...inputValidationStatus, beneficiaryLastName: false});
            validClient = false;
        }
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
        
        <div>
            <ErrorModal/>
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
                <CModalBody className="px-5">
                    <CInputGroup className="mb-3 py-3">
                        <CInputGroupText>Client's First Name</CInputGroupText>
                        <CFormInput id="first-name"
                            onChange={(e) =>{
                                setInputValidationStatus({...inputValidationStatus, firstName: true})
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
                                    setInputValidationStatus({...inputValidationStatus, lastName: true})
                                    const newClientState = {
                                        ...clientState,
                                        lastName: e.target.value
                                    }
                                    setClientState(newClientState)
                                }
                            }
                        />
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>
                            <CFormCheck type="checkbox" id="useCompanyName" checked={useCompanyName} onChange={(e) => setUseCompanyName(e.target.checked)}/>
                        </CInputGroupText>
                        <CInputGroupText>Company Name</CInputGroupText>
                        <CFormInput id="company-name" 
                        onChange={
                            (e) => {
                                setInputValidationStatus({...inputValidationStatus, companyName: true})
                                const newClientState = {
                                    ...clientState,
                                    companyName: e.target.value
                                }
                                setClientState(newClientState)
                            }
                        } 
                        disabled={!useCompanyName}/>
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>Address</CInputGroupText>
                        <CFormInput id="address" 
                            onChange={(e) => {
                                setInputValidationStatus({...inputValidationStatus, address: true})
                                const newClientState = {
                                    ...clientState,
                                    address: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>DOB</CInputGroupText>
                        <CFormInput type="date" id="dob" 
                            onChange={(e) => {
                                setInputValidationStatus({...inputValidationStatus, dob: true})
                                const newClientState = {
                                    ...clientState,
                                    dob: new Date(e.target.value),
                                };
                                setClientState(newClientState)
                        }}/>
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>Phone Number</CInputGroupText>
                        <CFormInput id="phone-number" 
                            onChange={(e) => {
                                setInputValidationStatus({...inputValidationStatus, phoneNumber: true})
                                const newClientState = {
                                    ...clientState,
                                    phoneNumber: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>Email</CInputGroupText>
                        <CFormInput type="email" id="email" 
                            onChange={(e) => {
                                setInputValidationStatus({...inputValidationStatus, initEmail: true})
                                const newClientState = {
                                    ...clientState,
                                    initEmail: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>First Deposit Date</CInputGroupText>
                        <CFormInput type="date" id="first-deposit-date" 
                            onChange={(e) => {
                                setInputValidationStatus({...inputValidationStatus, firstDepositDate: true})
                                const newClientState = {
                                    ...clientState,
                                    firstDepositDate: new Date(e.target.value),
                                };
                                setClientState(newClientState)
                        }}/>
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>Beneficiary's First Name</CInputGroupText>
                        <CFormInput id="beneficiaryFirstName" 
                            onChange={(e) => {
                                setInputValidationStatus({...inputValidationStatus, beneficiaryFirstName: true})
                                const newClientState = {
                                    ...clientState,
                                    beneficiaryFirstName: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                        <CInputGroupText>Beneficiary's Last Name</CInputGroupText>
                        <CFormInput id="beneficiaryLastName" 
                            onChange={(e) => {
                                setInputValidationStatus({...inputValidationStatus, beneficiaryLastName: true})
                                const newClientState = {
                                    ...clientState,
                                    beneficiaryLastName: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                    </CInputGroup>

                    <CMultiSelect 
                        id="connected-users"
                        className="mb-3  py-3" 
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
                    
                    <CContainer className=" py-3">
                        <CRow>
                        <CCol>
                            <h5>AGQ Fund Assets</h5>
                            <AssetFormComponent title="Personal" id="agq-personal" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="Company" id="agq-company" fund="agq" disabled={!useCompanyName} state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="IRA" id="agq-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="Roth IRA" id="agq-roth-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="SEP IRA" id="agq-sep-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="NuView Cash IRA" id="agq-nuview-cash-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="NuView Cash Roth IRA" id="agq-nuview-cash-roth-ira" fund="agq" state={clientState} setClientState={setClientState}/>
                        </CCol>
                        <CCol>
                            <h5>AK1 Fund Assets</h5>
                            <AssetFormComponent title="Personal" id="ak1-personal" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="Company" id="ak1-company" fund="ak1" disabled={!useCompanyName} state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="IRA" id="ak1-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="Roth IRA" id="ak1-roth-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="SEP IRA" id="ak1-sep-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="NuView Cash IRA" id="ak1-nuview-cash-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                            <AssetFormComponent title="NuView Cash Roth IRA" id="ak1-nuview-cash-roth-ira" fund="ak1" state={clientState} setClientState={setClientState}/>
                        </CCol>
                        </CRow>
                    </CContainer>

                    <div className="mb-3  py-3">
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


const AssetFormComponent: React.FC<{title: string, id: string, disabled?: boolean, fund: string, state: User, setClientState: (clientState: User) => void}> = ({title, id, disabled, fund, state, setClientState}) => {
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

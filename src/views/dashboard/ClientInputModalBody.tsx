import { CModalBody, CInputGroup, CInputGroupText, CFormInput, CFormCheck, CMultiSelect, CContainer, CRow, CCol } from '@coreui/react-pro';
import { User } from '../../db/database.ts'
import { Option, OptionsGroup } from '@coreui/react-pro/dist/esm/components/multi-select/types';

export interface InputValidationStatus {
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

interface ClientInputProps {
    clientState: User,
    setClientState: (clientState: User) => void,
    inputValidationStatus: InputValidationStatus,
    setInputValidationStatus: (inputValidationStatus: InputValidationStatus) => void,
    useCompanyName: boolean,
    setUseCompanyName: (useCompanyName: boolean) => void,
    userOptions: (Option | OptionsGroup)[]
}


export const ClientInputModalBody: React.FC<ClientInputProps> = ({
    clientState, 
    setClientState,
    inputValidationStatus,
    setInputValidationStatus,
    useCompanyName,
    setUseCompanyName,
    userOptions,
}) => {
    return (
        <CModalBody className="px-5">
                    <CInputGroup className="mb-3 py-3">
                        <CInputGroupText>Client's First Name</CInputGroupText>
                        <CFormInput id="first-name" value={clientState.firstName}
                            onChange={(e) =>{
                                setInputValidationStatus({...inputValidationStatus, firstName: true})
                                const newClientState = {
                                    ...clientState,
                                    firstName: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                        <CInputGroupText>Client's Last Name</CInputGroupText>
                        <CFormInput id="last-name" value={clientState.lastName}
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
                        <CFormInput id="address" value={clientState.address}
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
                        <CFormInput type="date" id="dob"  value = {clientState.dob?.toISOString().split('T')[0]}
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
                        <CFormInput id="phone-number" value={clientState.phoneNumber}
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
                        <CFormInput type="email" id="email" value={clientState.initEmail}
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
                        <CFormInput type="date" id="first-deposit-date" value={clientState.firstDepositDate?.toISOString().split('T')[0]}
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
                        <CFormInput id="beneficiaryFirstName"  value={clientState.beneficiaryFirstName}
                            onChange={(e) => {
                                setInputValidationStatus({...inputValidationStatus, beneficiaryFirstName: true})
                                const newClientState = {
                                    ...clientState,
                                    beneficiaryFirstName: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                        <CInputGroupText>Beneficiary's Last Name</CInputGroupText>
                        <CFormInput id="beneficiaryLastName" value={clientState.beneficiaryLastName}
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
    )
} 

type ValidationStatusKey = 'firstName' | 'lastName' | 'companyName' | 'address' | 'dob' | 'phoneNumber' | 'initEmail' | 'firstDepositDate' | 'beneficiaryFirstName' | 'beneficiaryLastName';

export const ValidateClient = (
    clientState: User, 
    useCompanyName: boolean,
    inputValidationStatus: InputValidationStatus, 
    setInputValidationStatus: (inputValidationStatus: InputValidationStatus) => void,
    setInvalidInputFields: (invalidInputFields: string[]) => void ) => {
        
    let validClient = true;
    let fields: string[] = [];
    let newInputValidationStatus = { ...inputValidationStatus };

    const fieldValidations: { name: ValidationStatusKey, displayName: string, condition: boolean }[] = [
        { name: 'firstName', displayName: 'First Name', condition: clientState.firstName === '' },
        { name: 'lastName', displayName: 'Last Name', condition: clientState.lastName === '' },
        { name: 'companyName', displayName: 'Company Name', condition: useCompanyName && clientState.companyName === '' },
        { name: 'address', displayName: 'Address', condition: clientState.address === '' },
        { name: 'dob', displayName: 'DOB', condition: !clientState.dob || isNaN(clientState.dob.getTime()) },
        { name: 'phoneNumber', displayName: 'Phone Number', condition: clientState.phoneNumber === '' },
        { name: 'initEmail', displayName: 'Email', condition: clientState.initEmail === '' },
        { name: 'firstDepositDate', displayName: 'First Deposit Date', condition: !clientState.firstDepositDate || isNaN(clientState.firstDepositDate.getTime()) },
        { name: 'beneficiaryFirstName', displayName: 'Beneficiary\'s First Name', condition: clientState.beneficiaryFirstName === '' },
        { name: 'beneficiaryLastName', displayName: 'Beneficiary\'s Last Name', condition: clientState.beneficiaryLastName === '' },
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
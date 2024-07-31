import { CModalBody, CInputGroup, CInputGroupText, CFormInput, CFormCheck, CMultiSelect, CContainer, CRow, CCol } from '@coreui/react-pro';
import { Activity, User } from '../../db/database.ts'
import { Option, OptionsGroup } from '@coreui/react-pro/dist/esm/components/multi-select/types';
import Papa from 'papaparse';
import { parse, format } from 'date-fns';


interface ClientInputProps {
    clientState: User,
    setClientState: (clientState: User) => void,
    useCompanyName: boolean,
    setUseCompanyName: (useCompanyName: boolean) => void,
    userOptions: (Option | OptionsGroup)[]
}

// Handles the file input from the user
const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, clientState: User, setClientState: (state: User) => void) => {

    const getActivityType = (type: string | undefined) => {
        if (!type) return "none";
        switch (type) {
            case "withdrawal":
                return "income"
            case "deposit":
                return "deposit"
            default:
                return "other"
        }
    }

    const file = event.target.files?.[0];
    if (!file) return;

    let i: number = 2;

    // Parse the CSV file
    Papa.parse(file, {
        header: true,
        complete: (results) => {
            // Initialize an array to store the activities
            let activities: Activity[] = [];
            // For each row in the CSV, create a new activity
            results.data.forEach((row: any) => {
                // Skip if row is empty
                if (Object.values(row).every(x => (x === null || x === ''))) return;

                // Remove the fund type after the dash and convert the name to title case
                let name = row["Security Name"].split('-').shift()?.trim();
                name = name?.toLowerCase().replace(/\b(\w)/g, (s: string) => s.toUpperCase());

                // Check if name does not match client's full name or company name
                const clientFullName = clientState.firstName + ' ' + clientState.lastName;
                if (name !== clientFullName && name !== clientState.companyName) return;

                if (i === 2) { console.log(row["Date"]); }

                // Parse the date string correctly
                const parsedDate = parse(row["Date"], 'yyyy-MM-dd', new Date());

                // Create an activity from each row of the CSV
                const activity: Activity = {
                    fund: "AGQ", // TODO: Add support for AK1
                    amount: Math.abs(parseFloat(row["Amount (Unscaled)"])),
                    recipient: name,
                    time: parsedDate,
                    type: getActivityType(row["Type"]),
                };

                if (i === 2) { console.log(parsedDate); }

                // Add to the activities array
                activities.push(activity);
                console.log(JSON.stringify(activity));
                i++;
            });

            // Update the client state with the new activities
            const newClientState = {
                ...clientState,
                activities: [...(clientState.activities || []), ...activities],
            };
            setClientState(newClientState)
        },
    });
};


export const ClientInputModalBody: React.FC<ClientInputProps> = ({
    clientState, 
    setClientState,
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
                                const newClientState = {
                                    ...clientState,
                                    address: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>DOB</CInputGroupText>
                        <CFormInput type="date" id="dob"  value = {clientState.dob?.toISOString().split('T')[0] ?? ''}
                            onChange={(e) => {
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
                                const newClientState = {
                                    ...clientState,
                                    initEmail: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                    </CInputGroup>

                    <CInputGroup className="mb-3  py-3">
                        <CInputGroupText>First Deposit Date</CInputGroupText>
                        <CFormInput type="date" id="first-deposit-date" value={clientState.firstDepositDate?.toISOString().split('T')[0] ?? ''}
                            onChange={(e) => {
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
                                const newClientState = {
                                    ...clientState,
                                    beneficiaryFirstName: e.target.value,
                                };
                                setClientState(newClientState)
                        }}/>
                        <CInputGroupText>Beneficiary's Last Name</CInputGroupText>
                        <CFormInput id="beneficiaryLastName" value={clientState.beneficiaryLastName}
                            onChange={(e) => {
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

                    <EditAssetsSection clientState={clientState} setClientState={setClientState} useCompanyName={useCompanyName}/>
                

                    <div className="mb-3  py-3">
                        <h5>Upload Previous Activities</h5>
                        <div  className="mb-3 py-3">
                            <CFormInput type="file" id="formFile" onChange={(event) => handleFileChange(event, clientState, setClientState)}/>
                        </div>
                    </div>
                </CModalBody>
    )
} 

export const ValidateClient = (clientState: User, useCompanyName: boolean, setInvalidInputFields: (fields: string[]) => void) => {
    let validClient = true;
    let fields: string[] = [];

    const fieldValidations: { displayName: string, condition: boolean }[] = [
        { displayName: 'First Name', condition: clientState.firstName === '' },
        { displayName: 'Last Name', condition: clientState.lastName === '' },
        { displayName: 'Company Name', condition: useCompanyName && clientState.companyName === '' },
        { displayName: 'Address', condition: clientState.address === '' },
        { displayName: 'DOB', condition: !clientState.dob || isNaN(clientState.dob.getTime()) },
        { displayName: 'Phone Number', condition: clientState.phoneNumber === '' },
        { displayName: 'Email', condition: clientState.initEmail === '' },
        { displayName: 'First Deposit Date', condition: !clientState.firstDepositDate || isNaN(clientState.firstDepositDate.getTime()) },
        { displayName: 'Beneficiary\'s First Name', condition: clientState.beneficiaryFirstName === '' },
        { displayName: 'Beneficiary\'s Last Name', condition: clientState.beneficiaryLastName === '' },
    ];

    fieldValidations.forEach(({ displayName, condition }) => {
        if (condition) {
            fields.push(displayName);
            validClient = false;
        }
    });
    
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

export const EditAssetsSection: React.FC<{clientState: User, setClientState: (clientState: User) => void, useCompanyName: boolean}> = ({clientState, setClientState, useCompanyName}) => {
    return (    
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
    </CContainer>)
}



export const AssetFormComponent: React.FC<{title: string, id: string, disabled?: boolean, fund: string, state: User, setClientState: (clientState: User) => void}> = ({title, id, disabled, fund, state, setClientState}) => {
    return (
        <CInputGroup className="mb-3 py-3">
            <CInputGroupText style={{ width: "200px" }}>{title}</CInputGroupText>
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
                            [fund]: {
                                ...state.assets[fund],
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
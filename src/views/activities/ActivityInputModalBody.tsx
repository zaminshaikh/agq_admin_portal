import { CModal, CModalHeader, CModalTitle, CModalFooter, CButton, CCol, CContainer, CDatePicker, CFormInput, CFormSelect, CFormSwitch, CInputGroup, CInputGroupText, CModalBody, CMultiSelect, CRow } from "@coreui/react-pro";
import { OptionsGroup } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import React from "react";
import { Activity, User, DatabaseService} from "src/db/database";
import { EditAssetsSection } from "../dashboard/ClientInputModalBody";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
// import { ActivityInputModalBody } from "./ActivityInputModalBody.tsx";

interface ActivityInputProps {
    activityState: Activity,
    setActivityState: (clientState: Activity) => void,
    clientState: User | null,
    setClientState: (clientState: User | null) => void,
    userOptions: OptionsGroup[],
}

interface ErrorModalProps {
    showErrorModal: boolean,
    setShowErrorModal: (show: boolean) => void,
    invalidInputFields: string[],
}

export const ValidateActivity = (activityState: Activity, setInvalidInputFields: (fields: string[]) => void) => {
    let validClient = true;
    let fields: string[] = [];

    const fieldValidations: { displayName: string, condition: boolean }[] = [
        { displayName: 'Activity Amount', condition: activityState.amount <= 0 || isNaN(activityState.amount) },
        { displayName: 'Fund', condition: activityState.fund === '' },
        { displayName: 'Recipient', condition: activityState.recipient === '' },
        { displayName: 'Time', condition: activityState.time === null },
        { displayName: 'Type', condition: activityState.type === '' }
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

export const ErrorModal: React.FC<ErrorModalProps> = ({showErrorModal, setShowErrorModal, invalidInputFields}) => {
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

export const ActivityInputModalBody: React.FC<ActivityInputProps> = ({
    activityState, 
    setActivityState, 
    clientState,
    setClientState,
    userOptions,
}) => {
    const db = new DatabaseService();

    const handleDateChange = (newDate: Date | null) => {
        if (newDate === null) {return;}
        setActivityState({...activityState, time: newDate!});
    };

    return (
        <CModalBody>
            <CInputGroup className="mb-3 py-1 px-3">
                <CInputGroupText as="label" htmlFor="inputGroupSelect01">Type</CInputGroupText>
                <CFormSelect id="inputGroupSelect01" onChange={
                    (e) => {setActivityState({...activityState, type: e.currentTarget.value, isDividend: e.currentTarget.value === 'profit' ? activityState.isDividend : false})
                }}>
                    <option>Choose...</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="profit">Profit</option>
                    <option value="deposit">Deposit</option>
                    <option value="manual-entry">Manual Entry</option>
                </CFormSelect>
                <div className="px-3 "/>
                <CFormSwitch 
                    className="py-2"  
                    label="Dividend Payment" 
                    id="formSwitchCheckDisabled" 
                    disabled={activityState.type !== 'profit'} 
                    checked={activityState.isDividend} 
                    onChange={(e) => {
                        setActivityState({...activityState, isDividend: e.currentTarget.checked })
                    }}
                />
            </CInputGroup>
            <CContainer className="py-3 px-3">
                <CRow>
                <CCol>
                    <CDatePicker placeholder={"Date and Time of Activity"} date={new Date()} onDateChange={handleDateChange} timepicker/>    
                </CCol>
                <CCol>
                <CMultiSelect 
                        id="recipient"
                        className="mb-3a custom-multiselect-dropdown" // Added custom class here
                        options={userOptions} 
                        placeholder="Select Recipient" 
                        selectAll={false}
                        multiple={false}
                        allowCreateOptions={true}
                        onChange={async (selectedValue) => {
                            if (selectedValue.length === 0) {
                                // Handle the case where no options are selected
                                setActivityState({ ...activityState, recipient: '' });
                                setClientState(null); // Or reset to some default state
                            } else {
                                // Index 0 since only one option can be selected
                                const recipient = selectedValue.map(selected => selected.label as string)[0];
                                const cid = selectedValue.map(selected => selected.value as string)[0];
                                const newActivityState = {
                                    ...activityState,
                                    recipient: recipient,
                                };
                                setActivityState(newActivityState);
                                // Fetch the user data from the database
                                setClientState(await db.getUser(cid));
                            }
                        }}
                    /> 
                </CCol>
                </CRow>
            </CContainer>
            <CInputGroup className="mb-3 py-3 px-3">
                <CInputGroupText as="label" htmlFor="inputGroupSelect01">Fund</CInputGroupText>
                <CFormSelect id="inputGroupSelect01" onChange={(e) => {
                        setActivityState({...activityState, fund: e.currentTarget.value})
                    }}
                >
                    <option>Choose...</option>
                    <option value="AK1">AK1 Fund</option>
                    <option value="AGQ">AGQ Fund</option>
                </CFormSelect>

                <CInputGroupText>Amount</CInputGroupText>
                <CInputGroupText>$</CInputGroupText>
                <CFormInput id='amount' type="number" step="1000" value={activityState.amount}
                onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                        const newState = {
                            ...activityState,
                            amount: parseFloat(value)
                        }; 
                        setActivityState(newState);
                    }
                }}
                onBlur={(e) => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseFloat(value))) {
                        const newState = {
                            ...activityState,
                            amount: 0 
                        };
                        setActivityState(newState);
                    } 
                }}/>
            </CInputGroup>
            {clientState && (activityState.isDividend || activityState.type === 'manual-entry') && activityState.fund && <EditAssetsSection clientState={clientState} setClientState={setClientState} useCompanyName={clientState.companyName !== null} activeFund={activityState.fund}/>}
            
        </CModalBody>
    )

}
    
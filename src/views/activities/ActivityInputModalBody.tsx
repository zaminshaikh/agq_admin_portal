import { CModal, CModalHeader, CModalTitle, CModalFooter, CButton, CCol, CContainer, CDatePicker, CFormInput, CFormSelect, CFormSwitch, CInputGroup, CInputGroupText, CModalBody, CMultiSelect, CRow, CTooltip } from "@coreui/react-pro";
import { OptionsGroup } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import React, { useEffect, useState } from "react";
import { Activity, User, DatabaseService, emptyUser} from "src/db/database";
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
    setOverride: (override: boolean) => void,
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

export const ErrorModal: React.FC<ErrorModalProps> = ({showErrorModal, setShowErrorModal, invalidInputFields, setOverride}) => {
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
                    <FontAwesomeIcon className="pr-5" icon={faExclamationTriangle} color="red" />  WARNING
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
                <CButton color="danger" variant="outline" onClick={() => {
                    setOverride(true);
                    setShowErrorModal(false);
                }}>OVERRIDE & CREATE</CButton>

                <CButton color="primary" onClick={() => {
                    setShowErrorModal(false);
                }}>Go Back</CButton>
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
    const [date, setDate] = React.useState<Date | null>(new Date());
    const [isRecipientSameAsUser, setIsRecipientSameAsUser] = useState<boolean>(true);
    console.log("RECIPIENT", activityState.recipient)
    console.log("CLIENT", clientState?.firstName + ' ' + clientState?.lastName)

    const handleDateChange = (newDate: Date | null) => {
        if (newDate === null) {return;}
        setDate(newDate);
        setActivityState({...activityState, time: newDate!});
    };

    useEffect(() => {
        if (activityState.recipient === null || activityState.recipient === '') {return;}
        setIsRecipientSameAsUser(activityState.recipient == clientState?.firstName + ' ' + clientState?.lastName);
    }, [clientState]);

    return (
        <CModalBody>
            <CInputGroup className="mb-3 py-1 px-3">
                <CInputGroupText as="label" htmlFor="inputGroupSelect01">Type</CInputGroupText>
                <CFormSelect id="inputGroupSelect01" value={activityState?.type} onChange={
                    (e) => {setActivityState({...activityState, type: e.currentTarget.value});
                    console.log(clientState);
                }}>
                    <option>Choose...</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="profit">Profit</option>
                    <option value="deposit">Deposit</option>
                    <option value="manual-entry">Manual Entry</option>
                </CFormSelect>
                <div className="px-3"/>
                <CFormSwitch 
                    className="py-2"  
                    label="Dividend Payment" 
                    id="formSwitchCheckDisabled" 
                    disabled={activityState.type !== 'profit'} 
                    checked={activityState.type == 'profit' && activityState.isDividend} 
                    onChange={(e) => {
                        setActivityState({...activityState, isDividend: e.currentTarget.checked })
                    }}
                />
            </CInputGroup>
            <CContainer className="py-3 px-3">
                <CRow>
                <CCol>
                    <CDatePicker placeholder={"Date and Time of Activity"} date={date} onDateChange={handleDateChange} timepicker/>    
                </CCol>
                <CCol>
                <CMultiSelect
                    id="user"
                    className="mb-3a custom-multiselect-dropdown"
                    options={userOptions}
                    defaultValue={[]}
                    placeholder="Select User"
                    selectAll={false}
                    multiple={false}
                    allowCreateOptions={false}
                    onChange={async (selectedValue) => {
                        if (selectedValue.length === 0) {
                            setClientState(await db.getUser(activityState.parentDocId ?? ''));
                        } else {
                            const user = selectedValue.map(selected => selected.label as string)[0];
                            const cid = selectedValue.map(selected => selected.value as string)[0];
                            setClientState(await db.getUser(cid) ?? await db.getUser(activityState.parentDocId ?? ''));

                            // Update the recipient as well if the checkbox is checked
                            if (isRecipientSameAsUser) {
                                setActivityState({ ...activityState, recipient: user });
                            }
                        }
                    }}
                />
                </CCol>
                </CRow>
            </CContainer>
            <CContainer className="py-3 px-3">
                <CRow>
                    <CCol xl={4}>
                    <CInputGroup>
                        <CTooltip
                            placement="left"
                            content={"Sometimes you may need the recipient of the activity to differ from the user who's activity it is. Uncheck this box to type a different recipient."}
                        >
                            <CFormSwitch
                                id="sameAsUserCheckbox"
                                label="Recipient is the same as the user"
                                checked={isRecipientSameAsUser}
                                onChange={(e) => {
                                    setIsRecipientSameAsUser(e.target.checked);
                                    if (e.target.checked && clientState) {
                                        setActivityState({ ...activityState, recipient: clientState.firstName + ' ' + clientState.lastName });
                                    }
                                }}
                            />
                        </CTooltip>
                    </CInputGroup>
                    </CCol>
                    <CCol xl={8}>
                    <CFormInput
                        id="recipient"
                        className="mb-3a custom-multiselect-dropdown"
                        value={activityState.recipient}
                        placeholder="Select Recipient"
                        multiple={false}
                        disabled={isRecipientSameAsUser} // Disable this dropdown if the checkbox is checked
                        onChange={(e) => {
                            setActivityState({ ...activityState, recipient: e.target.value });
                        }}
                    />
                    </CCol>
                </CRow>
            </CContainer>            
            <CInputGroup className="mb-3 py-3 px-3">
                <CInputGroupText as="label" htmlFor="inputGroupSelect01">Fund</CInputGroupText>
                <CFormSelect id="inputGroupSelect01" defaultValue={activityState.fund} onChange={(e) => {
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
            {clientState && ((activityState.isDividend && activityState.type === 'profit') || activityState.type === 'manual-entry') && activityState.fund && 
                <EditAssetsSection clientState={clientState} setClientState={setClientState} useCompanyName={clientState.companyName !== null} activeFund={activityState.fund}/>}
            
        </CModalBody>
    )

}
    
import { CModal, CModalHeader, CModalTitle, CModalFooter, CButton, CCol, CContainer, CDatePicker, CFormInput, CFormSelect, CFormSwitch, CInputGroup, CInputGroupText, CModalBody, CMultiSelect, CRow, CTooltip } from "@coreui/react-pro";
import { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import React, { act, useEffect, useState } from "react";
import { Activity, Client, DatabaseService, emptyClient, roundToNearestHour} from "src/db/database";
import { EditAssetsSection } from "../../components/EditAssetsSection";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { time } from "console";
import { Timestamp } from "firebase/firestore";
// import { ActivityInputModalBody } from "./ActivityInputModalBody.tsx";

interface ActivityInputProps {
    activityState: Activity,
    setActivityState: (clientState: Activity) => void,
    clientState: Client | null,
    setClientState: (clientState: Client | null) => void,
    clientOptions: Option[],
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


export const ActivityInputModalBody: React.FC<ActivityInputProps> = ({
    activityState, 
    setActivityState, 
    clientState,
    setClientState,
    clientOptions,
}) => {
    
    const db = new DatabaseService();

    // Convert and round the date to the nearest hour
    const initialDate = activityState.time instanceof Timestamp
        ? roundToNearestHour(activityState.time.toDate())
        : roundToNearestHour(activityState.time);
    const [date, setDate] = React.useState<Date | null>(initialDate);
    const [isRecipientSameAsClient, setIsRecipientSameAsClient] = useState<boolean>(true);

    const handleDateChange = (newDate: Date | null) => {
        if (newDate === null) { return; }
        const roundedDate = roundToNearestHour(newDate);
        setDate(roundedDate);
        setActivityState({ ...activityState, time: roundedDate });
    };

    useEffect(() => {
        const newDate = activityState.time instanceof Timestamp
            ? roundToNearestHour(activityState.time.toDate())
            : roundToNearestHour(activityState.time);
        
        setActivityState({...activityState, time: newDate});
    }, [date]);

    useEffect(() => {
        if (activityState.recipient === null || activityState.recipient === '') {return;}
        setIsRecipientSameAsClient(activityState.recipient == clientState?.firstName + ' ' + clientState?.lastName);
    }, [activityState.recipient, clientState]);

    return (
        <CModalBody>
            <CInputGroup className="mb-3 py-1 px-3">
                <CInputGroupText as="label" htmlFor="inputGroupSelect01">Type</CInputGroupText>
                <CFormSelect id="inputGroupSelect01" value={activityState?.type != '' ? activityState?.type : "profit"} onChange={
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
                    checked={activityState.isDividend} 
                    onChange={(e) => {
                        setActivityState({...activityState, isDividend: e.currentTarget.checked })
                    }}
                />
                <div className="px-3"/>
                <CFormSwitch 
                    className="py-2"  
                    label="Amortization Payment" 
                    id="formSwitchCheckDisabled" 
                    disabled={activityState.type !== 'profit' || activityState.amortizationCreated} 
                    checked={activityState.isAmortization} 
                    onChange={(e) => {
                        setActivityState({...activityState, isAmortization: e.currentTarget.checked, amortizationCreated: false })
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
                    id="client"
                    className="mb-3a custom-multiselect-dropdown"
                    options={clientOptions}
                    defaultValue={clientState?.cid}
                    placeholder="Select Client"
                    selectAll={false}
                    multiple={false}
                    allowCreateOptions={false}
                    onChange={async (selectedValue) => {
                        if (selectedValue.length === 0) {
                            setClientState(await db.getClient(activityState.parentDocId ?? ''));
                        } else {
                            const client = selectedValue.map(selected => selected.label as string)[0];
                            const cid = selectedValue.map(selected => selected.value as string)[0];
                            setClientState(await db.getClient(cid) ?? await db.getClient(activityState.parentDocId ?? ''));

                            // Update the recipient as well if the checkbox is checked
                            if (isRecipientSameAsClient) {
                                setActivityState({ ...activityState, recipient: client });
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
                            content={"Sometimes you may need the recipient of the activity to differ from the client who's activity it is. Uncheck this box to type a different recipient."}
                        >
                            <CFormSwitch
                                id="sameAsClientCheckbox"
                                label="Recipient is the same as the client"
                                checked={isRecipientSameAsClient}
                                onChange={(e) => {
                                    setIsRecipientSameAsClient(e.target.checked);
                                    if (e.target.checked && clientState) {
                                        setActivityState({ ...activityState, recipient: clientState.firstName + ' ' + clientState.lastName });
                                    } else if (clientState) {
                                        setActivityState({ ...activityState, recipient: clientState.companyName});
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
                        value={activityState.recipient }
                        placeholder="Select Recipient"
                        multiple={false}
                        disabled={isRecipientSameAsClient} // Disable this dropdown if the checkbox is checked
                        onChange={(e) => {
                            setActivityState({ ...activityState, recipient: e.target.value });
                        }}
                    />
                    </CCol>
                </CRow>
            </CContainer>            
            <CInputGroup className="mb-3 py-3 px-3">
                <CInputGroupText as="label" htmlFor="inputGroupSelect01">Fund</CInputGroupText>
                <CFormSelect id="inputGroupSelect01" defaultValue={"AGQ"} value={activityState.fund != '' ? activityState.fund : undefined}onChange={(e) => {
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
                        let newState;
                        if (activityState.isAmortization && activityState.amortizationCreated && activityState.type === 'withdrawal') {
                            newState = {
                                ...activityState,
                                amount: parseFloat(value),
                                principalPaid: parseFloat(value)
                            }; 
                        } else if (activityState.isAmortization && activityState.amortizationCreated && activityState.type === 'profit') {
                            newState = {
                                ...activityState,
                                amount: parseFloat(value),
                                profitPaid: parseFloat(value)
                            };
                        } else {
                            newState = {
                                ...activityState,
                                amount: parseFloat(value)
                            }; 
                        }
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

            {clientState && activityState.isAmortization && <CInputGroup className="mb-3 py-3 px-3">
                <CInputGroupText>Principal Paid</CInputGroupText>
                <CInputGroupText>$</CInputGroupText>
                <CFormInput id='amount' type="number" step="1000" value={activityState.principalPaid}
                disabled={activityState.amortizationCreated}
                onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                        const newState = {
                            ...activityState,
                            principalPaid: parseFloat(value),
                            profitPaid: activityState.amount - parseFloat(value)
                        }; 
                        setActivityState(newState);
                    }
                }}
                onBlur={(e) => {
                    const value = e.target.value;
                    if (value === '' || isNaN(parseFloat(value))) {
                        const newState = {
                            ...activityState,
                            principalPaid: 0,
                            profitPaid: activityState.amount
                        };
                        setActivityState(newState);
                    } 
                }}/>
                <CInputGroupText>Profit Paid</CInputGroupText>
                <CInputGroupText>$</CInputGroupText>
                <CFormInput id='amount' type="number" step="1000" value={activityState.profitPaid} disabled />
            </CInputGroup>}

            {clientState && (((activityState.isDividend || activityState.isAmortization) && activityState.type === 'profit') || activityState.type === 'manual-entry' || activityState.type === 'deposit' || activityState.type === 'withdrawal') && activityState.fund && 
                <EditAssetsSection 
                    clientState={clientState} 
                    setClientState={setClientState} 
                    useCompanyName={clientState.companyName !== null} 
                    activeFund={activityState.fund}
                    incrementAmount={activityState.isAmortization? activityState.principalPaid : activityState.amount}/>}
            
        </CModalBody>
    )

}
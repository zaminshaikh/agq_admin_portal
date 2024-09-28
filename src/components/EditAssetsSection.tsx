import { CContainer, CRow, CCol, CInputGroup, CInputGroupText, CFormInput } from "@coreui/react-pro";
import { Client } from "../db/database";

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

export const EditAssetsSection: React.FC<{
    clientState: Client, 
    setClientState: (clientState: Client) => void, 
    useCompanyName: boolean, 
    activeFund?: string, 
    incrementAmount?: number,
    viewOnly?: boolean
}> = ({
    clientState, 
    setClientState, 
    useCompanyName, 
    activeFund, 
    incrementAmount = 1000, 
    viewOnly = null
}) => {
    return (    
        <CContainer className="py-3">
            <CRow>
                <CCol>
                    <h5>AGQ Fund Assets</h5>
                    <AssetFormComponent title="Personal" id="agq-personal" fund="agq" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AGQ' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="Company" id="agq-company" fund="agq" disabled={viewOnly ?? (!(useCompanyName && activeFund == 'AGQ'))} clientState={clientState} setClientState={setClientState} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="IRA" id="agq-ira" fund="agq" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AGQ' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="Roth IRA" id="agq-roth-ira" fund="agq" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AGQ' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="SEP IRA" id="agq-sep-ira" fund="agq" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AGQ' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="NuView Cash IRA" id="agq-nuview-cash-ira" fund="agq" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AGQ' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="NuView Cash Roth IRA" id="agq-nuview-cash-roth-ira" fund="agq" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AGQ' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                </CCol>
                <CCol>
                    <h5>AK1 Fund Assets</h5>
                    <AssetFormComponent title="Personal" id="ak1-personal" fund="ak1" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AK1' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="Company" id="ak1-company" fund="ak1" disabled={viewOnly ?? (!(useCompanyName && activeFund == 'AK1'))} clientState={clientState} setClientState={setClientState} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="IRA" id="ak1-ira" fund="ak1" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AK1' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="Roth IRA" id="ak1-roth-ira" fund="ak1" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AK1' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="SEP IRA" id="ak1-sep-ira" fund="ak1" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AK1' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="NuView Cash IRA" id="ak1-nuview-cash-ira" fund="ak1" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AK1' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                    <AssetFormComponent title="NuView Cash Roth IRA" id="ak1-nuview-cash-roth-ira" fund="ak1" clientState={clientState} setClientState={setClientState} disabled={viewOnly ?? (activeFund !== 'AK1' && activeFund !== undefined)} incrementAmount={incrementAmount} />
                </CCol>
            </CRow>
        </CContainer>
    );
}

export const AssetFormComponent: React.FC<{title: string, id: string, disabled?: boolean, fund: string, clientState: Client, setClientState: (clientState: Client) => void, incrementAmount: number}> = ({title, id, disabled, fund, clientState, setClientState, incrementAmount}) => {
    return (
        <CInputGroup className="mb-3 py-3">
            <CInputGroupText style={{ width: "200px" }}>{title}</CInputGroupText>
            <CInputGroupText>$</CInputGroupText>
            <CFormInput id={id} disabled={disabled} type="number" step={incrementAmount} value={clientState["assets"][fund][getAssetType(id)]} 
            onChange={(e) => {
                const value = e.target.value;
                if (/^\d*\.?\d{0,2}$/.test(value)) {
                    // Update the client state with the new asset value
                    const newState = {
                        ...clientState,
                        assets: {
                            ...clientState.assets,
                            [fund]: {
                                ...clientState.assets[fund],
                                [getAssetType(id)]: parseFloat(value)
                            }
                        }
                    };
                    // Update the client state
                    setClientState(newState);
                }
            }}
            onBlur={(e) => {
                const value = e.target.value;
                if (value === '' || isNaN(parseFloat(value))) {
                    // Reset the asset value to 0
                    const newState = {
                        ...clientState,
                        assets: {
                            ...clientState.assets,
                            [fund]: {
                                ...clientState.assets[fund],
                                [getAssetType(id)]: 0
                            }
                        }
                    };
                    setClientState(newState);
                } 
            }}/>
        </CInputGroup>
    );      
}
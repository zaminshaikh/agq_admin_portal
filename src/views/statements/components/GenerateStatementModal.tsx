import { CModal, CModalHeader, CModalTitle, CModalBody, CMultiSelect, CFormInput, CAlert, CModalFooter, CButton, CDateRangePicker, CInputGroup, CInputGroupText, CLoadingButton } from '@coreui/react-pro';
import { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import React, { useMemo } from 'react';
import { Client, DatabaseService } from 'src/db/database';

interface GenerateStatementModalProps {
  showModal: boolean,
  setShowModal: (show: boolean) => void,
  clientOptions: Option[],
}

const GenerateStatementModal: React.FC<GenerateStatementModalProps> = ({showModal, setShowModal, clientOptions}) => {
  const db = new DatabaseService();  
  const [currentClient, setCurrentClient] = React.useState<Client | null>(null);
  const [selectedAccount, setSelectedAccount] = React.useState<string>("Cumulative");
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const assetOptions = useMemo(() => {
    if (!currentClient) return [{ label: "Cumulative", value: "Cumulative" }];

    let titles = new Set<string>();
    titles.add("Cumulative"); // Add "Cumulative" to the set
    for (const fund in currentClient.assets) {
        for (const assetType in currentClient.assets[fund]) {
            const displayTitle = currentClient.assets[fund][assetType].displayTitle;
            if (displayTitle === 'Personal') {
                titles.add(`${currentClient.firstName} ${currentClient.lastName}`);
            } else {
                titles.add(displayTitle);
            }
        }
    }
    
    const arr = [...titles];

    return arr.map((title) =>
        ({ label: title, value: title })
    );
  }, [currentClient]);

  return (
    <CModal visible={showModal} onClose={() => setShowModal(false)} size='lg' alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Generate Statement</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <>
          <CInputGroup className="mb-3 w-100">
            <CInputGroupText>Client</CInputGroupText>
            <CMultiSelect
              id="client"
              className="flex-grow-1"
              style={{ minWidth: 0 }}
              options={clientOptions}
              defaultValue={currentClient?.cid}
              placeholder="Select Client"
              selectAll={false}
              multiple={false}
              allowCreateOptions={false}
              onChange={async (selectedValue) => {
                if (selectedValue.length === 0) return;
                const cid = selectedValue[0].value as string
                const newClient = await db.getClient(cid)
                if (newClient) setCurrentClient(newClient)
              }}
            />

            <CInputGroupText>Account</CInputGroupText>
            <CMultiSelect
              id="recipient"
              className="flex-grow-1"
              style={{ minWidth: 0 }}
              options={assetOptions}
              defaultValue={"Cumulative"}
              placeholder="Select Recipient"
              multiple={false}
              onChange={(selected) => {
                const val = (selected[0]?.value as string) || ''
                setSelectedAccount(val);
              }}
            />
          </CInputGroup>
          <CInputGroup className='mb-3'>
            <CInputGroupText>Start Date</CInputGroupText>
            <CFormInput type='date' onChange={
              (e) => {
                const date = new Date(e.target.value);
                setStartDate(date);
              }
            }/>
            <CInputGroupText>End Date</CInputGroupText>
            <CFormInput type='date' onChange={
              (e) => {
                const date = new Date(e.target.value);
                setEndDate(date);
              }
            }/>
          </CInputGroup>
          {startDate && endDate && startDate > endDate && (
            <div className="text-danger mt-2">
              Start date must be before end date.
            </div>
          )}
        </>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => setShowModal(false)} >
          Cancel
        </CButton>
        <CLoadingButton
          color="primary" 
          onClick={
            async () => {
              const db = new DatabaseService();
              setIsLoading(true);
              await db.generateStatementPDF(currentClient!, startDate!, endDate!, selectedAccount);
              setIsLoading(false);
              setShowModal(false);
            }
          }
          loading={isLoading}
          disabled={!currentClient || !startDate || !endDate || startDate > endDate}  // Disable button if any of the fields are empty
        >
          Generate
        </CLoadingButton>
      </CModalFooter>
    </CModal>
  );
};

export default GenerateStatementModal;
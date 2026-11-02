import { CModal, CModalHeader, CModalTitle, CModalBody, CMultiSelect, CFormInput, CFormCheck, CAlert, CModalFooter, CButton, CInputGroup, CInputGroupText, CLoadingButton } from '@coreui/react-pro';
import { Option } from "@coreui/react-pro/dist/esm/components/multi-select/types";
import React, { useMemo } from 'react';
import { Client, DatabaseService } from 'src/db/database';

interface GenerateStatementModalProps {
  showModal: boolean,
  setShowModal: (show: boolean) => void,
  clientOptions: Option[],
  onUploadSuccess: () => void,
}

const GenerateStatementModal: React.FC<GenerateStatementModalProps> = ({showModal, setShowModal, clientOptions, onUploadSuccess}) => {
  const db = new DatabaseService();  
  const [currentClient, setCurrentClient] = React.useState<Client | null>(null);
  const [selectedAccount, setSelectedAccount] = React.useState<string>("Cumulative");
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [uploadToDocuments, setUploadToDocuments] = React.useState(false);
  const [error, setError] = React.useState('');
  const clientRequest = React.useRef(0);

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
    <CModal visible={showModal} onClose={() => { if (!isLoading) setShowModal(false); }} backdrop={isLoading ? 'static' : true} keyboard={!isLoading} size='lg' alignment="center">
      <CModalHeader closeButton={!isLoading}>
        <CModalTitle>Generate Statement</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <fieldset disabled={isLoading}>
          <CInputGroup className="mb-3 w-100">
            <CInputGroupText>Client</CInputGroupText>
            <CMultiSelect
              id="client"
              disabled={isLoading}
              className="flex-grow-1"
              style={{ minWidth: 0 }}
              options={clientOptions}
              defaultValue={currentClient?.cid}
              placeholder="Select Client"
              selectAll={false}
              multiple={false}
              allowCreateOptions={false}
              onChange={async (selectedValue) => {
                const request = ++clientRequest.current;
                setSelectedAccount('Cumulative');
                setCurrentClient(null);
                setError('');
                if (selectedValue.length === 0) return;
                try {
                  const newClient = await db.getClient(selectedValue[0].value as string);
                  if (request !== clientRequest.current) return;
                  setCurrentClient(newClient);
                  if (!newClient) setError('This client could not be found. Please select another client.');
                } catch {
                  if (request === clientRequest.current) setError('Could not load the client. Please select the client again.');
                }
              }}
            />

            <CInputGroupText>Account</CInputGroupText>
            <CMultiSelect
              id="recipient"
              disabled={isLoading}
              key={currentClient?.cid ?? 'no-client'}
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
                const date = e.target.value ? new Date(e.target.value) : null;
                setStartDate(date);
              }
            }/>
            <CInputGroupText>End Date</CInputGroupText>
            <CFormInput type='date' onChange={
              (e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                setEndDate(date);
              }
            }/>
          </CInputGroup>
          {startDate && endDate && startDate > endDate && (
            <div className="text-danger mt-2">
              Start date must be before end date.
            </div>
          )}
          <CFormCheck
            id="upload-generated-statement"
            label="Upload to client documents"
            checked={uploadToDocuments}
            onChange={(event) => setUploadToDocuments(event.target.checked)}
          />
          <div className="text-body-secondary mt-2">The PDF will also be downloaded to your computer.</div>
          {error && <CAlert color="danger" className="mt-3">{error}</CAlert>}
        </fieldset>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => setShowModal(false)} disabled={isLoading}>
          Cancel
        </CButton>
        <CLoadingButton
          color="primary" 
          onClick={
            async () => {
              const db = new DatabaseService();
              setIsLoading(true);
              setError('');
              try {
                await db.generateStatementPDF(currentClient!, startDate!, endDate!, selectedAccount, uploadToDocuments);
                if (uploadToDocuments) onUploadSuccess();
                setShowModal(false);
              } catch {
                setError(uploadToDocuments
                  ? 'Could not generate or upload the statement. Please try again.'
                  : 'Could not generate the statement. Please try again.');
              } finally {
                setIsLoading(false);
              }
            }
          }
          loading={isLoading}
          disabled={isLoading || !currentClient || !selectedAccount || !startDate || !endDate || startDate > endDate}
        >
          Generate
        </CLoadingButton>
      </CModalFooter>
    </CModal>
  );
};

export default GenerateStatementModal;

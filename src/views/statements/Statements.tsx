// Statements.tsx

import React, { useEffect, useState } from 'react';
import { CContainer, CButton, CCol, CRow } from "@coreui/react-pro";
import { Routes, Route } from 'react-router-dom';
import ClientStatementsPage from './components/ClientStatementsPage';
import AddStatementModal from './components/AddStatementsModal';
import GenerateStatementModal from './components/GenerateStatementModal';
import { DatabaseService } from 'src/db/database';
import { cilFile } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const Statements: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [clientOptions, setClientOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [showGenerateStatementModal, setShowGenerateStatementModal] = useState(false);

  const handleOpenModal = () => {
    setIsAddModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsAddModalVisible(false);
  };

  const handleUploadSuccess = () => {
    setIsAddModalVisible(false);
    window.location.reload();
  };

  useEffect(() => {
    const fetchActivities = async () => {
        const db = new DatabaseService();
        const clients = await db.getClients();

        setClientOptions(
            clients!
                .map(client => ({ value: client.cid, label: client.firstName + ' ' + client.lastName }))
                .sort((a, b) => a.label.localeCompare(b.label))
        ); 
        setClients(clients);
        setIsLoading(false);
    };
    fetchActivities();
  }, []);

  return (
    <CContainer>

      <CRow className="mb-3 mx-1">
        <CCol>
          <CButton color='primary' onClick={() => setIsAddModalVisible(true)} className="w-100">+ Add Statement</CButton>
        </CCol>
        <CCol>
          <CButton
            color="info"
            onClick={() => setShowGenerateStatementModal(true)}
            className="w-100 d-flex align-items-center justify-content-center"
          >
            <CIcon icon={cilFile} className="me-2" />
            Generate Statement
          </CButton>
        </CCol>
      </CRow>

      {/* Add Statement Modal */}
      <AddStatementModal
        visible={isAddModalVisible}
        onClose={handleCloseModal}
        onUploadSuccess={handleUploadSuccess}
      />

      {showGenerateStatementModal && 
        <GenerateStatementModal
          showModal={showGenerateStatementModal}
          setShowModal={setShowGenerateStatementModal}
          clientOptions={clientOptions}
        />
      }

      {/* Client Statements Page */}
      <ClientStatementsPage />
    </CContainer>
  );
};

export default Statements;
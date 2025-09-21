import React, { useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAlert,
  CSpinner,
  CRow,
  CCol,
} from '@coreui/react-pro';
import { Client } from 'src/db/database';
import { httpsCallable } from 'firebase/functions';
import { functions } from 'src/db/database';

interface SendInviteModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  client: Client | undefined;
}

interface SendInviteEmailRequest {
  clientName: string;
  clientEmail: string;
  clientCid: string;
}

interface SendInviteEmailResponse {
  success: boolean;
  message: string;
  emailId?: string;
}

const SendInviteModal: React.FC<SendInviteModalProps> = ({
  showModal,
  setShowModal,
  client,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertColor, setAlertColor] = useState<'success' | 'danger'>('success');

  const handleSendInvite = async () => {
    if (!client) {
      setAlertMessage('No client selected');
      setAlertColor('danger');
      return;
    }

    // Validate that client has an email
    if (!client.initEmail && !client.appEmail) {
      setAlertMessage('Client must have an email address to send an invite');
      setAlertColor('danger');
      return;
    }

    setIsLoading(true);
    setAlertMessage('');

    try {
      // Use the initial email or app email, preferring initEmail
      const emailToUse = client.initEmail || client.appEmail;
      const clientName = `${client.firstName} ${client.lastName}`.trim();

      const sendInviteEmailFunction = httpsCallable<SendInviteEmailRequest, SendInviteEmailResponse>(
        functions,
        'sendInviteEmail'
      );

      const result = await sendInviteEmailFunction({
        clientName: clientName,
        clientEmail: emailToUse,
        clientCid: client.cid,
      });

      if (result.data.success) {
        setAlertMessage(`Invite email sent successfully to ${emailToUse}`);
        setAlertColor('success');
        
        // Auto-close modal after 3 seconds on success
        setTimeout(() => {
          setShowModal(false);
        }, 3000);
      } else {
        setAlertMessage(result.data.message || 'Failed to send invite email');
        setAlertColor('danger');
      }
    } catch (error) {
      console.error('Error sending invite email:', error);
      setAlertMessage('Failed to send invite email. Please try again.');
      setAlertColor('danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setAlertMessage('');
    setIsLoading(false);
  };

  if (!client) {
    return null;
  }

  const clientName = `${client.firstName} ${client.lastName}`.trim();
  const emailToUse = client.initEmail || client.appEmail;

  return (
    <CModal
      visible={showModal}
      onClose={handleClose}
      alignment="center"
      backdrop="static"
    >
      <CModalHeader>
        <CModalTitle>Send App Invitation</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {alertMessage && (
          <CAlert color={alertColor} className="mb-3">
            {alertMessage}
          </CAlert>
        )}
        
        <div className="mb-3">
          <h6>Client Information:</h6>
          <CRow className="mb-2">
            <CCol sm="4"><strong>Name:</strong></CCol>
            <CCol sm="8">{clientName || 'N/A'}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm="4"><strong>CID:</strong></CCol>
            <CCol sm="8">{client.cid}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm="4"><strong>Email:</strong></CCol>
            <CCol sm="8">{emailToUse || 'No email address'}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm="4"><strong>Linked:</strong></CCol>
            <CCol sm="8">{client.linked ? 'Yes' : 'No'}</CCol>
          </CRow>
        </div>

        {!emailToUse && (
          <CAlert color="warning">
            This client does not have an email address. Please add an email address before sending an invite.
          </CAlert>
        )}

        {client.linked && (
          <CAlert color="info">
            This client is already linked to the app. They may already have access.
          </CAlert>
        )}

        <p className="text-muted">
          An invitation email will be sent to the client with instructions on how to download 
          and set up the AGQ mobile app using their Client ID (CID).
        </p>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          onClick={handleClose}
          disabled={isLoading}
        >
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={handleSendInvite}
          disabled={isLoading || !emailToUse}
        >
          {isLoading ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Sending...
            </>
          ) : (
            'Send Invite'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default SendInviteModal;

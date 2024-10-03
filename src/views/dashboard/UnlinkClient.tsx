import {
  CButton,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from "@coreui/react-pro";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Client, DatabaseService } from "src/db/database";


interface ShowModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  client?: Client;
  setClients: (users: Client[]) => void;
}

export const UnlinkClient: React.FC<ShowModalProps> = ({
  showModal,
  setShowModal,
  client,
  setClients,
}) => {
  const service = new DatabaseService();
  const [email, setEmail] = useState("");
  const [doEmailsMatch, setDoEmailsMatch] = useState(false);

  useEffect(() => {
    setDoEmailsMatch(email === client?.initEmail);
  }, [email, client]);

  const unlinkClient = async () => {
    console.log(client);
    if (client?.uid) {
      await service.unlinkClient(client);
      setClients(await service.getClients());
      setShowModal(false);
    }
  };

  return (
    <CModal
      scrollable
      alignment="center"
      visible={showModal}
      backdrop="static"
      size="lg"
      onClose={() => setShowModal(false)}
    >
      <CModalHeader>
        <CModalTitle>
          <FontAwesomeIcon
            className="pr-2"
            icon={faExclamationTriangle}
            color="red"
          />{" "}
          WARNING
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="px-5">
        You are about to unlink the client <strong>{client?.name}</strong> (
        {client?.initEmail}). THIS ACTION IS IRREVERSIBLE. To confirm, please type the
        client's email below:
        <div className="py-3">
          <CInputGroup>
            <CInputGroupText>Client's Email</CInputGroupText>
            <CFormInput
              placeholder="Enter client's email"
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </CInputGroup>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => setShowModal(false)}>
          Cancel
        </CButton>
        <CButton
          color="danger"
          variant="outline"
          disabled={!doEmailsMatch}
          onClick={() => unlinkClient()}
        >
          Unlink
        </CButton>
      </CModalFooter>
    </CModal>
  );
};
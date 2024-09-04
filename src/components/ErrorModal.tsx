import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from "@coreui/react-pro";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ErrorModalProps {
    showErrorModal: boolean,
    setShowErrorModal: (show: boolean) => void,
    invalidInputFields: string[],
    setOverride: (override: boolean) => void,
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
                }}>OVERRIDE & PROCEED</CButton>

                <CButton color="primary" onClick={() => {
                    setShowErrorModal(false);
                }}>Go Back</CButton>
            </CModalFooter>
        </CModal>
    )
}
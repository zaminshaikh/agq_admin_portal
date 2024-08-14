import React from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react-pro';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Activity, DatabaseService, formatCurrency } from 'src/db/database';

interface DeleteActivityProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    activity?: Activity; // Replace `any` with the appropriate type for `user`
}

const DeleteActivity: React.FC<DeleteActivityProps> = ({ showModal, setShowModal, activity }) => {
    const service = new DatabaseService();

    const deleteActivity = async () => {
        if (activity && activity.id) {
            try {
                await service.deleteActivity(activity);
                await service.deleteNotification(activity);
                setShowModal(false);
                window.location.reload();
            } catch (error) {
                console.error('Failed to delete activity:', error);
                // Optionally, show an error message to the user
            }
        }
    };

    return (
        <CModal         
            scrollable
            alignment="center"
            visible={showModal} 
            backdrop="static" 
            size="lg"
            onClose={() => setShowModal(false)}>
            <CModalHeader>
                <CModalTitle>
                    <FontAwesomeIcon className="pr-5" icon={faExclamationTriangle} color="red" />  WARNING
                </CModalTitle>
            </CModalHeader>
            <CModalBody className="px-5">
    <div className="py-3">
        <strong className="d-block mb-3">You are about to delete the activity with the following details:</strong>
        <div className="mb-2">
            <strong>Recipient:</strong> <span>{activity?.recipient as string}</span>
        </div>
        <div className="mb-2">
            <strong>Time:</strong> <span>{activity?.formattedTime as string}</span>
        </div>
        <div className="mb-2">
            <strong>Amount:</strong> <span>{formatCurrency(activity?.amount as number)}</span>
        </div>
        <div className="mb-2">
            <strong>Type:</strong> <span>{activity?.type as string}</span>
        </div>
        <div className="mb-2">
            <strong>Fund:</strong> <span>{activity?.fund as string}</span>
        </div>
        <strong className="d-block mt-3 text-danger">THIS ACTION IS IRREVERSIBLE.</strong>
    </div>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={() => setShowModal(false)}>Cancel</CButton>
                <CButton color="danger" variant="outline"
                    onClick={() => deleteActivity()}>Delete</CButton>
            </CModalFooter>
        </CModal>
    );
};

export default DeleteActivity;
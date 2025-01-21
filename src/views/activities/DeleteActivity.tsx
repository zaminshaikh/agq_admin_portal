import React from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton, CToast, CToastBody, CToastHeader } from '@coreui/react-pro';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Activity, DatabaseService, formatCurrency } from 'src/db/database';

interface DeleteActivityProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    activity?: Activity; 
    selectedClient?: string | number;
    setAllActivities: (activites: Activity[]) => void;
    setFilteredActivities: (activites: Activity[]) => void;
}

const exampleToast = (
  <CToast>
    <CToastHeader closeButton>
      <svg
        className="rounded me-2"
        width="20"
        height="20"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        role="img"
      >
        <rect width="100%" height="100%" fill="#007aff"></rect>
      </svg>
      <div className="fw-bold me-auto">CoreUI for React.js</div>
      <small>7 min ago</small>
    </CToastHeader>
    <CToastBody>Hello, world! This is a toast message.</CToastBody>
  </CToast>
)

const DeleteActivity: React.FC<DeleteActivityProps> = ({showModal, setShowModal, activity, selectedClient, setAllActivities, setFilteredActivities}) => {
    const db = new DatabaseService();

    const deleteActivity = async () => {
        if (activity && activity.id) {
            try {
                await db.deleteActivity(activity);
                await db.deleteNotification(activity);
                setShowModal(false);
                const activities = await db.getActivities(); // Get the new updated activities
                setAllActivities(activities)
                // Filter by the client we just deleted an activity for
                if (selectedClient) {
                    setFilteredActivities(activities.filter((activities) => activities.parentDocId === selectedClient));
                } else {
                    setFilteredActivities(activities);
                }
                // addToast(exampleToast);
            } catch (error) {
                console.error('Failed to delete activity:', error);
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